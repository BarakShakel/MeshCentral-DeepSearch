"use strict";

module.exports.deepsearch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.meshServer = parent.parent;

    // Functions exposed to the frontend browser
    obj.exports = ['onWebUIStartupEnd', 'goPageEnd'];

    obj.server_startup = function () {
        console.log('DeepSearch plugin loaded on server.');
    };

    // ── Client-Side Code (runs in the browser) ─────────────────────────────

    obj.onWebUIStartupEnd = function () {
        pluginHandler.deepsearch.injectSearchBar();
    };

    obj.goPageEnd = function (page, event) {
        if (page === 1) {
            pluginHandler.deepsearch.injectSearchBar();
        }
    };

    obj.injectSearchBar = function () {
        if (document.getElementById('deepsearch-bar')) return;

        var existingFilter = document.getElementById('ft');
        if (!existingFilter) return;

        var bar = document.createElement('div');
        bar.id = 'deepsearch-bar';
        bar.style.cssText = 'margin: 4px 0; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;';
        bar.innerHTML = [
            '<span style="font-size:12px;font-weight:bold;">&#x1F50D; DeepSearch:</span>',
            '<input id="ds-ip"   type="text" placeholder="Filter by IP..."         style="padding:2px 6px;font-size:12px;border:1px solid #ccc;border-radius:3px;" />',
            '<input id="ds-user" type="text" placeholder="Filter by Username..."   style="padding:2px 6px;font-size:12px;border:1px solid #ccc;border-radius:3px;" />',
            '<input id="ds-desc" type="text" placeholder="Filter by Description..." style="padding:2px 6px;font-size:12px;border:1px solid #ccc;border-radius:3px;" />',
            '<button id="ds-clear" style="padding:2px 8px;font-size:12px;cursor:pointer;">Clear</button>'
        ].join('');

        existingFilter.parentNode.insertBefore(bar, existingFilter);

        ['ds-ip', 'ds-user', 'ds-desc'].forEach(function (id) {
            document.getElementById(id).addEventListener('input', pluginHandler.deepsearch.applyFilter);
        });
        document.getElementById('ds-clear').addEventListener('click', pluginHandler.deepsearch.clearFilter);
    };

    obj.applyFilter = function () {
        var ipFilter   = (document.getElementById('ds-ip')   || {}).value.trim().toLowerCase();
        var userFilter = (document.getElementById('ds-user') || {}).value.trim().toLowerCase();
        var descFilter = (document.getElementById('ds-desc') || {}).value.trim().toLowerCase();

        var nodes = (typeof meshcentral !== 'undefined') ? meshcentral.nodes : null;
        if (!nodes) return;

        Object.keys(nodes).forEach(function (nodeId) {
            var node = nodes[nodeId];
            var rowEl = document.getElementById('node-' + nodeId);
            if (!rowEl) return;

            var match = true;

            if (ipFilter) {
                var ip = (node.ip || '').toLowerCase();
                if (ip.indexOf(ipFilter) === -1) match = false;
            }

            if (match && userFilter) {
                var userStr = '';
                if (node.users) {
                    userStr = Object.keys(node.users).join(' ').toLowerCase();
                }
                if (userStr.indexOf(userFilter) === -1) match = false;
            }

            if (match && descFilter) {
                var desc = (node.desc || '').toLowerCase();
                if (desc.indexOf(descFilter) === -1) match = false;
            }

            rowEl.style.display = match ? '' : 'none';
        });
    };

    obj.clearFilter = function () {
        ['ds-ip', 'ds-user', 'ds-desc'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        pluginHandler.deepsearch.applyFilter();
    };

    return obj;
};
