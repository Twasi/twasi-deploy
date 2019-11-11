const Maven = require('maven');
const fs = require('fs');

const build = async (single = false) => {
    const folder = './clone-dir';

    console.log('Initializing maven project...');
    const mvnProject = Maven.create({cwd: folder, quiet: true});

    console.log("Compiling maven project%s...", (single ? ' with dependencies' : ''));
    const mvnCommands = ['clean', 'compile', 'package'];
    if (single) mvnCommands.push('assembly:single');
    await mvnProject.execute(mvnCommands, {});

    console.log('Maven task finished. Looking for output jars...');
    const targetFolder = fs.readdirSync(folder + '/target');
    const jars = targetFolder.filter(jar => jar.endsWith((single ? '-jar-with-dependencies' : '') + '.jar'));

    if (jars.length === 0) {
        console.log('Build seems to be failed. There is no jar file.');
        throw 'Build error';
    }

    console.log('Jar file found: %s', jars[0]);
    return folder + '/' + jars[0];
};

module.exports = build;
