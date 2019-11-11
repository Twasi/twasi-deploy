/* DIRECTORY SETUP */
const fs = require("fs");
for (let folder of ['clone-dir', 'build-output', 'ssh-keys', 'logs', 'logs/build'])
    if (!fs.existsSync('./' + folder))
        fs.mkdirSync('./' + folder);

/* LOAD CONFIG */
const config = require("./config");
const deployment = config["deployment-server"];

/* DEFINE WEBHOOK HANDLERS */
const pushHandler = async event => {
    const repo = event.payload.repository;
    const branch = event.payload.ref.replace('refs/heads/', '');
    clearCloneDir();
    await require('./github/clone')(repo.clone_url, branch, repo.default_branch);
    await require('./build')();
};

const pingHandler = event => {
    const repo = event.payload.repository;
    const org = event.payload.organization;
    if (repo || org)
        console.log(
            "Successfully received GitHub webhook ping for %s %s (%s).",
            org ? 'organization' : 'repository',
            (repo || {}).full_name || (org || {}).login,
            (repo || {}).description || (org || {}).description
        );
    else {
        console.log('Received unknown webhook ping.');
    }
};

const errorHandler = err => {
    console.error('Error:', err.message)
};

/* START WEBHOOK */
require('./github/webhook')(pushHandler, pingHandler, errorHandler);

/* OTHER STUFF */
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

function clearCloneDir() {
    deleteFolderRecursive('./clone-dir');
    fs.mkdirSync('./clone-dir');
}
