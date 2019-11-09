const fs = require("fs");
for (let folder of ['./clone-dir', './build-output', 'ssh-keys'])
    if (!fs.existsSync(folder))
        fs.mkdirSync(folder);

const config = require("./config");
const Git = require("simple-git/promise")('./clone-dir');
const Maven = require("maven");
const HTTP = require("http");
const Webhook = require("github-webhook-handler");
const FTPS = require('ftps');
const SSH = require('node-ssh');

let deployment = config["deployment-server"];

const handler = Webhook({path: '/', secret: config.github.webhook.secret});
HTTP.createServer((req, res) => {
    handler(req, res, err => {
        res.statusCode = 404;
        res.end('no such location')
    });
}).listen(config.github.webhook.port);

handler.on('push', async (event) => {
    const branch = event.payload.ref.replace('refs/heads/', '');
    console.log('Incoming push for branch %s. Searching for deployment configuration...', branch);

    let dp;
    try {
        dp = config.deployments.filter(dp => dp.branch === branch)[0];
    } catch (ex) {
        console.log('No configuration found.');
        return;
    }

    console.log('Configuration found. Deleting old version...');
    deleteFolderRecursive('./clone-dir');
    fs.mkdirSync('./clone-dir');

    console.log('Cloning new version...');
    const cred = config.github.credentials;
    const uri = event.payload.repository.clone_url
        .replace('://', '://' + cred.username + ':' + cred.token + '@');
    await Git.clone(uri, '.');

    console.log('Cloned. Switching to branch %s...', branch);
    await Git.checkoutBranch(branch, event.payload.repository.default_branch);

    console.log('Initializing maven...');
    const mvnProject = Maven.create({cwd: './clone-dir'});

    console.log("Compiling maven project...");
    await mvnProject.execute(['clean', 'compile', 'package', 'assembly:single'], {});

    console.log("Done. Deploying...");
    const target = fs.readdirSync('./clone-dir/target');
    const jar = target.filter(file => file.endsWith('-jar-with-dependencies.jar'))[0];
    fs.copyFileSync('./clone-dir/target/' + jar, './build-output/twasi-core.jar');

    const files = ftps();
    files.cd(deployment.basePath + dp.location);
    files.put('build-output/twasi-core.jar').exec(async (res) => {
        // console.log(res);
        console.log("Deployed. Restarting...");
        const client = await ssh();
        const screen = "screen -S " + dp.screen + " -X stuff ";
        console.log(await client.exec(screen + "'^C\n'"));
        console.log(await client.exec(screen + "'java -jar twasi-core.jar'\n"));
        client.dispose();
    });
});

handler.on('ping', event => {
    const repo = event.payload.repository;
    console.log("Successfully received GitHub webhook ping for repository %s (%s).",
        repo.full_name,
        repo.description);
});

handler.on('error', function (err) {
    console.error('Error:', err.message)
});

const deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            const curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

const ftps = () => {
    const client = new FTPS({
        host: deployment.host,
        username: deployment.username,
        password: deployment.password,
        protocol: deployment.connection.protocol,
        port: deployment.connection.port,
        retries: 2,
        autoConfirm: true,
        requireSSHKey: true,
        sshKeyPath: './ssh-keys'
    });
    return client;
};

const ssh = async () => {
    const ssh = new SSH();
    await ssh.connect({
        host: deployment.host,
        username: deployment.username,
        password: deployment.password,
        port: 22
    });
    await ssh.requestShell();
    return ssh;
};
