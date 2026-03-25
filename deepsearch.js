/**
 * MeshCentral DeepSearch Plugin
 * Adds IP, username, and description search to the My Devices page.
 *
 * Uses only documented plugin hooks:
 *   - onWebUIStartupEnd
 *   - goPageEnd
 */

var deepsearch = {

    // Called once after login / page refresh
    onWebUIStartupEnd: function () {
        deepsearch.injectSearchBar();
    },

    // Called after every page navigation
    // arg1 is the page number; My Devices is page 1
    goPageEnd: function (page, event) {
        if (page === 1) {
            deepsearch.injectSearchBar();
        }
    },

    // Inject the advanced search bar above the existing filter box
    injectSearchBar: function () {
        // Avoid double-inject
        if (document.getElementById('deepsearch-bar')) return;

        // Find the existing search/filter area MeshCentral uses on My Devices
        // The filter input has id="ft" in MeshCentral's default UI
        var existingFilter = document.getElementById('ft');
        if (!existingFilter) return;

        var bar = document.createElement('div');
        bar.id = 'deepsearch-bar';
        bar.style.cssText = 'margin: 4px 0; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;';
        bar.innerHTML = [
            '<span style="font-size:12px;font-weight:bold;">&#x1F50D; DeepSearch:</span>',
            '<input id="ds-ip"   type="text" placeholder="Filter by IP..."          style="padding:2px 6px;font-size:12px;border:1px solid #ccc;border-radius:3px;" />',
            '<input id="ds-user" type="text" placeholder="Filter by Username..."    style="padding:2px 6px;font-size:12px;border:1px solid #ccc;border-radius:3px;" />',
            '<input id="ds-desc" type="text" placeholder="Filter by Description..."  style="padding:2px 6px;font-size:12px;border:1px solid #ccc;border-radius:3px;" />',
            '<button id="ds-clear" style="padding:2px 8px;font-size:12px;cursor:pointer;">Clear</button>'
        ].join('');

        // Insert just before the existing filter row
        existingFilter.parentNode.insertBefore(bar, existingFilter);

        // Wire up events
        ['ds-ip', 'ds-user', 'ds-desc'].forEach(function (id) {
            document.getElementById(id).addEventListener('input', deepsearch.applyFilter);
        });
        document.getElementById('ds-clear').addEventListener('click', deepsearch.clearFilter);
    },

    // Read current filter values and apply to device rows
    applyFilter: function () {
        var ipFilter   = (document.getElementById('ds-ip')   || {}).value.trim().toLowerCase();
        var userFilter = (document.getElementById('ds-user') || {}).value.trim().toLowerCase();
        var descFilter = (document.getElementById('ds-desc') || {}).value.trim().toLowerCase();

        // MeshCentral stores loaded node data in meshcentral.nodes
        // Each node id maps to an object; relevant fields:
        //   node.name  - device name
        //   node.ip    - last known IP (string)
        //   node.desc  - description tag
        //   node.users - object whose keys are user IDs currently logged in
        //
        // Device list rows have id="node-<nodeid>" in the default UI
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
    },

    // Clear all filters and show all rows
    clearFilter: function () {
        ['ds-ip', 'ds-user', 'ds-desc'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        deepsearch.applyFilter();
    }
};
