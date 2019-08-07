#!/usr/bin/env bash
set -e

export NVM_DIR=${NVM_DIR-$HOME/.nvm}

function install() {
    if [[ ! -d $NVM_DIR ]]; then
        mkdir -p $NVM_DIR
        curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
    fi

    if [[ ! $(command -v nvm) ]]; then
        set +e
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        set -e
    fi

    nvm install
}

function setIdeaToUseNvm() {
    if [ -f .idea/workspace.xml ]; then
        NODE_VERSION=$(nvm use |  grep -oEi 'v[0-9.]+' | head -1)
        echo Setting IDEA workspace to $NODE_VERSION
        sed -i "" "s/\.nvm\/versions\/node\/[^/]\+/\.nvm\/versions\/node\/${NODE_VERSION}/g" .idea/workspace.xml
    fi
}

install
setIdeaToUseNvm




