const { Plugin } = require('obsidian');

module.exports = class FreeColorsRainbowFixer extends Plugin {
    onload() {
        this.folderIndexMap = new Map();
        this.updateFolderMap();

        // Vault structure events
        this.registerEvent(this.app.vault.on('create', () => this.updateFolderMap()));
        this.registerEvent(this.app.vault.on('delete', () => this.updateFolderMap()));
        this.registerEvent(this.app.vault.on('rename', () => this.updateFolderMap()));
        this.registerEvent(this.app.workspace.on('layout-change', () => this.tagAllFolders()));

        // Setup observer for file explorer virtual DOM recycling
        this.setupObserver();
        this.tagAllFolders();
    }

    onunload() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        document.querySelectorAll('.nav-folder[data-fc-index]').forEach(el => {
            el.removeAttribute('data-fc-index');
        });
    }

    updateFolderMap() {
        const root = this.app.vault.getRoot();
        if (!root || !root.children) return;

        const rootFolders = root.children
            .filter(item => item.children !== undefined)
            .map(item => item.name)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        this.folderIndexMap.clear();
        rootFolders.forEach((name, index) => {
            this.folderIndexMap.set(name, (index % 10) + 1);
        });

        this.tagAllFolders();
    }

    tagAllFolders() {
        if (!this.folderIndexMap || this.folderIndexMap.size === 0) return;
        const leaves = this.app.workspace.getLeavesOfType("file-explorer");
        leaves.forEach(leaf => {
            const container = leaf.view && leaf.view.containerEl;
            if (!container) return;
            const folders = container.querySelectorAll('.nav-folder');
            folders.forEach(folderEl => this.tagFolder(folderEl));
        });
    }

    tagFolder(folderEl) {
        if (!folderEl) return;
        const titleEl = folderEl.querySelector('.nav-folder-title');
        if (!titleEl) return;
        const path = titleEl.getAttribute('data-path');
        if (!path) return;

        const rootName = path.split('/')[0];
        const index = this.folderIndexMap.get(rootName);
        if (index !== undefined) {
            const strIndex = index.toString();
            if (folderEl.getAttribute('data-fc-index') !== strIndex) {
                folderEl.setAttribute('data-fc-index', strIndex);
            }
        }
    }

    setupObserver() {
        const connect = () => {
            const leaves = this.app.workspace.getLeavesOfType("file-explorer");
            if (!leaves || leaves.length === 0) {
                setTimeout(connect, 400);
                return;
            }
            leaves.forEach(leaf => {
                const container = leaf.view && leaf.view.containerEl && leaf.view.containerEl.querySelector('.nav-files-container');
                if (container && !container._fc_fixed) {
                    container._fc_fixed = true;
                    this.observer = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            for (const node of mutation.addedNodes) {
                                if (node.nodeType === 1) {
                                    if (node.classList && node.classList.contains('nav-folder')) {
                                        this.tagFolder(node);
                                    }
                                    const children = node.querySelectorAll ? node.querySelectorAll('.nav-folder') : [];
                                    for (let i = 0; i < children.length; i++) {
                                        this.tagFolder(children[i]);
                                    }
                                }
                            }
                        }
                    });
                    this.observer.observe(container, { childList: true, subtree: true });
                }
            });
        };
        connect();
    }
};
