/**
 * FreeColors Rainbow Fixer (Obsidian Helper Snippet)
 * 
 * Author: erulmu (https://github.com/erulmu)
 * 
 * Usage:
 * - Load via "User Plugins" community plugin, or
 * - Run on Obsidian startup via "QuickAdd" macro.
 * 
 * Purpose:
 * Assigns fixed, deterministic color indices (data-fc-index="1..10")
 * to file explorer root folders based on alphabetical vault order,
 * preventing color shifting caused by Obsidian's virtualized DOM scrolling.
 */

(function initFreeColorsRainbowFixer() {
    const folderIndexMap = new Map();

    function updateFolderMap() {
        const root = app.vault.getRoot();
        if (!root || !root.children) return;

        const rootFolders = root.children
            .filter(item => item.children !== undefined)
            .map(item => item.name)
            .sort((a, b) => a.localeCompare(undefined, { numeric: true, sensitivity: 'base' }));

        folderIndexMap.clear();
        rootFolders.forEach((name, index) => {
            folderIndexMap.set(name, (index % 10) + 1);
        });

        tagAllFolders();
    }

    function tagFolder(folderEl) {
        if (!folderEl) return;
        const titleEl = folderEl.querySelector('.nav-folder-title');
        if (!titleEl) return;
        const path = titleEl.getAttribute('data-path');
        if (!path) return;

        const rootName = path.split('/')[0];
        const index = folderIndexMap.get(rootName);
        if (index !== undefined) {
            const strIndex = index.toString();
            if (folderEl.getAttribute('data-fc-index') !== strIndex) {
                folderEl.setAttribute('data-fc-index', strIndex);
            }
        }
    }

    function tagAllFolders() {
        if (folderIndexMap.size === 0) return;
        const leaves = app.workspace.getLeavesOfType("file-explorer");
        leaves.forEach(leaf => {
            const container = leaf.view && leaf.view.containerEl;
            if (!container) return;
            const folders = container.querySelectorAll('.nav-folder');
            folders.forEach(folderEl => tagFolder(folderEl));
        });
    }

    function setupObserver() {
        const leaves = app.workspace.getLeavesOfType("file-explorer");
        if (!leaves || leaves.length === 0) {
            setTimeout(setupObserver, 500);
            return;
        }

        leaves.forEach(leaf => {
            const container = leaf.view && leaf.view.containerEl && leaf.view.containerEl.querySelector('.nav-files-container');
            if (container && !container._fc_fixed) {
                container._fc_fixed = true;
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === 1) {
                                if (node.classList && node.classList.contains('nav-folder')) {
                                    tagFolder(node);
                                }
                                const children = node.querySelectorAll ? node.querySelectorAll('.nav-folder') : [];
                                for (let i = 0; i < children.length; i++) {
                                    tagFolder(children[i]);
                                }
                            }
                        }
                    }
                });
                observer.observe(container, { childList: true, subtree: true });
            }
        });
    }

    // Initialize
    updateFolderMap();
    setupObserver();

    // Register vault events
    if (app.vault && app.vault.on) {
        app.vault.on('create', updateFolderMap);
        app.vault.on('delete', updateFolderMap);
        app.vault.on('rename', updateFolderMap);
    }
    if (app.workspace && app.workspace.on) {
        app.workspace.on('layout-change', tagAllFolders);
    }

    console.log('[FreeColors] Rainbow Fixer snippet initialized.');
})();
