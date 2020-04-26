// MODIFIED FROM https://github.com/uber/baseweb/blob/07befaffd7b5e61792adac44e66da70918f54487/vrt/ci.js
const { execSync } = require('child_process');
const { Octokit } = require('@octokit/rest');
const {
    GITHUB_TOKEN,
    TRAVIS_BRANCH, // for builds triggered by a pull request this is the name of the branch targeted by the pull request.
    TRAVIS_PULL_REQUEST, // The pull request number if the current job is a pull request, “false” if it’s not a pull request.
    TRAVIS_PULL_REQUEST_BRANCH, // if the current job is a pull request, the name of the branch from which the PR originated.
    TRAVIS_PULL_REQUEST_SLUG, // if the current job is a pull request, the slug (in the form owner_name/repo_name) of the repository from which the PR originated.
    TRAVIS_REPO_SLUG, // The slug (in form: owner_name/repo_name) of the repository currently being built.
    TRAVIS_PULL_REQUEST_SHA, // if the current job is a pull request, the commit SHA of the HEAD commit of the PR.
} = process.env;

const SNAPSHOTS_BRANCH_PREFIX = 'snapshots';
const SNAPSHOTS_FOLDER = './test/__image_snapshots__';

const [ ORIGINAL_REPOSITORY_OWNER, ORIGINAL_REPOSITORY_NAME ] = getRepositoryOwnerAndName();

// Prepare GitHub API helper
const octokit = new Octokit({
    auth: GITHUB_TOKEN,
});

process.on('unhandledRejection', function (err) {
    log('The job has failed, but it is not a failure.');
    throw err;
});

// Utilities

function getRepositoryOwnerAndName() {
    const [ owner, name ] = TRAVIS_REPO_SLUG.split('/');
    log(`Original repository identified as '${owner}/${name}'.`);
    return [ owner, name ];
}

async function getSnapshotPullRequest(snapshot_branch_name) {
    try {
        const pullRequests = await octokit.pulls.list({
            owner: ORIGINAL_REPOSITORY_OWNER,
            repo: ORIGINAL_REPOSITORY_NAME,
            head: `${TRAVIS_REPO_SLUG}:${snapshot_branch_name}`,
        });
        const pullRequest = pullRequests.data[0]; // should only ever be one PR
        if (pullRequest) {
            log('An existing snapshot PR was found.');
            return pullRequest;
        } else {
            log('No existing snapshot PR was found.');
            return null;
        }
    } catch (er) {
        log(
            'There was an error fetching existing PRs so could not find an existing snapshot PR.'
        );
        log(er);
        return null;
    }
}


function getSnapshotBranchName() {
    return `${SNAPSHOTS_BRANCH_PREFIX}/${TRAVIS_PULL_REQUEST_SLUG}/${TRAVIS_PULL_REQUEST_BRANCH}`;
}

function log(message) {
    console.log(`VRT: ${message}`);
}

function pushChangesToGitHub(snapshot_branch_name) {
    log(
        `Creating a new snapshot branch: ${snapshot_branch_name}. ` +
            'This will overwrite any existing snapshot branch.'
    );
    execSync(`git checkout -b ${snapshot_branch_name}`);
    execSync(`git add ${SNAPSHOTS_FOLDER}`);
    log(`Commiting updated snapshots to ${snapshot_branch_name}.`);
    execSync(
        `git commit -m "test(vrt): update visual snapshots for ${TRAVIS_PULL_REQUEST_SHA} [skip ci]"`
    );
    log('Force pushing updated snapshot branch to GitHub.');
    execSync(`git push --force origin ${snapshot_branch_name}`);
}

/**
 * We are running this script after updating the snapshots.
 * @returns {Boolean} if there are files changed
 */
function someSnapshotsWereUpdated() {
    const stdout = execSync('git status --porcelain').toString();
    const changedFiles = stdout.split('\n');
    const result = changedFiles.some(s => s.match(/\/__image_snapshots__\//));
    if (result) {
        log('Some snapshots were updated.');
    } else {
        log('No snapshots were updated.');
    }
    return result;
}


main();

function buildIsValid() {
    if (TRAVIS_PULL_REQUEST === 'false') {
        log('The current job is not for a pull request. SKIP');
        return false;
    }
    if (TRAVIS_PULL_REQUEST_BRANCH.startsWith(SNAPSHOTS_BRANCH_PREFIX)) {
        log('This build was somehow triggered from a snapshot update branch!');
        log('This should not happen! Check the logs! Exiting early.');
        return false;
    }
    return true;

}

async function main() {
    if (!buildIsValid()) return;
    configureGit({GITHUB_TOKEN, user: 'danielo515', email: 'rdanielo@gmail.com'});
    await updateGitHub();
}

function configureGit({ GITHUB_TOKEN, user, email }) {
    log('Configuring git to allow for pushing new commits & branches.');
    execSync(
        `git config --global url."https://${GITHUB_TOKEN}:@github.com/".insteadOf "https://github.com/"`
    );
    execSync(`git config --global user.email ${email}`);
    execSync(`git config --global user.name ${user}`);
}

async function updateGitHub() {
    const snapshot_branch_name = getSnapshotBranchName();
    const snapshotPullRequest = await getSnapshotPullRequest(snapshot_branch_name);
    if (someSnapshotsWereUpdated()) {
        pushChangesToGitHub(snapshot_branch_name);
        await updatePullRequests(snapshotPullRequest, snapshot_branch_name);
        throw new Error(
            'Generated snapshots do not match currently checked in snapshots.'
        );
    } else {
        await removeSnapshotsWorkFromGitHub(snapshotPullRequest);
    }
}

async function updatePullRequests(snapshotPullRequest, snapshot_branch_name) {
    if (snapshotPullRequest) {
        log(
            'The existing snapshot PR has been updated with the latest snapshot diffs.',
        );
        await addCommentToOriginalPullRequest(snapshotPullRequest.html_url);
    } else {
        const newSnapshotPullRequest = await createSnapshotPullRequest();
        await addLabelsToSnapshotPullRequest(newSnapshotPullRequest.number);
        await addCommentToOriginalPullRequest(newSnapshotPullRequest.html_url);
        await addOriginalAuthorAsReviewer(newSnapshotPullRequest.number);
        log(
            `Snapshots on \`${snapshot_branch_name}\` must be merged into \`${TRAVIS_PULL_REQUEST_BRANCH}\` before it can be merged into \`master\`.`,
        );
    }
}

async function addOriginalAuthorAsReviewer(snapshotPullRequestNumber) {
    try {
        const originalPullRequest = await octokit.pulls.get({
            owner: ORIGINAL_REPOSITORY_OWNER,
            repo: ORIGINAL_REPOSITORY_NAME,
            pull_number: TRAVIS_PULL_REQUEST,
        });
        const author = originalPullRequest.data.user;
        await octokit.pulls.createReviewRequest({
            owner: ORIGINAL_REPOSITORY_OWNER,
            repo: ORIGINAL_REPOSITORY_NAME,
            pull_number: snapshotPullRequestNumber,
            reviewers: [ author.login ],
        });
        log(`Requested review from \`${author.login}\` on new snapshot PR.`);
    } catch (er) {
        log(
            'There was an error adding the original PR author as a reviewer for the new snapshot PR.',
        );
        log(er);
    }
}

async function addLabelsToSnapshotPullRequest(snapshotPullRequestNumber) {
    try {
        await octokit.issues.addLabels({
            owner: ORIGINAL_REPOSITORY_OWNER,
            repo: ORIGINAL_REPOSITORY_NAME,
            issue_number: snapshotPullRequestNumber,
            labels: [ 'greenkeeping', 'visual snapshot updates' ],
        });
        log('Added labels to new snapshot PR.');
    } catch (er) {
        log('There was an error adding labels to new snapshot PR.');
        log(er);
    }
}

async function addCommentToOriginalPullRequest(snapshotPullRequestUrl) {
    try {
        const comment = await octokit.issues.createComment({
            owner: 'uber',
            repo: 'baseweb',
            issue_number: BUILDKITE_PULL_REQUEST,
            body:
                'Visual changes were detected on this branch. ' +
                `Please review the following PR containing updated snapshots: ${snapshotPullRequestUrl}`,
        });
        log(
            `Posted a comment linking to snapshot PR on original PR: ${comment.data.html_url}`
        );
    } catch (er) {
        log('Error creating comment on original PR.');
        log(er);
    }
}
async function createSnapshotPullRequest(snapshot_branch_name) {
    const head = `${ORIGINAL_REPOSITORY_OWNER}:${snapshot_branch_name}`;
    log(`Pointing snapshot PR to: ${head}`);
    try {
        const pullRequest = await octokit.pulls.create({
            owner: ORIGINAL_REPOSITORY_OWNER,
            repo: ORIGINAL_REPOSITORY_NAME,
            title: `test(vrt): update visual snapshots for ${TRAVIS_PULL_REQUEST_BRANCH} [skip ci]`,
            head,
            base: TRAVIS_PULL_REQUEST_BRANCH,
            body:
                `This PR was generated based on visual changes detected in #${TRAVIS_PULL_REQUEST_BRANCH}. ` +
                `Please verify that the updated snapshots look correct before merging this PR into \`${TRAVIS_BRANCH}\`.`,
        });
        log(`Created a new snapshot PR: ${pullRequest.data.html_url}`);
        return pullRequest.data;
    } catch (error) {
        log('There was an error creating a new snapshot PR.');
        log(error);
        throw error;
    }
}

