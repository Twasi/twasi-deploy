const Git = require("simple-git/promise")('./clone-dir');
const config = require('../config');

const clone = async (repo, checkoutBranch, defaultBranch) => {
    const cred = config.github.credentials;
    repo = repo.replace('://', '://' + cred.username + ':' + cred.token + '@');
    await Git.clone(repo, '.');

    console.log('Cloned. Switching to branch %s...', checkoutBranch);
    await Git.checkoutBranch(checkoutBranch, defaultBranch);
};

module.exports = clone;
