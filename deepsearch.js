"use strict";

module.exports.deepsearch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.meshServer = parent.parent;

    // Functions exposed to the frontend browser
    obj.exports = [
        'onWebUIStartupEnd', 
        'goPageEnd', 
        'injectDeepSearchButton', 
        'showDeepSearchDialog', 
        'performDeepSearch', 
        'loadSearchResults', 
        'closeDeepSearch', 
        'esc'
    ];

    obj.server_startup = function () {
        console.log('Deep Search plugin loaded on server.');
    };

    // ==========================================
    // Part 1: Client-Side Code (Injected into browser)
    // ==========================================
    
    // Triggered when the Web UI initially loads
    obj.onWebUIStartupEnd = function () {
        pluginHandler.deepsearch.injectDeepSearchButton();
    };

    // Triggered whenever the user navigates between main tabs in MeshCentral
    obj.goPageEnd = function (page, event) {
        // Page 1 is the main "Devices" list view
        if (page === 1) {
            pluginHandler.deepsearch.injectDeepSearchButton();
        }
    };

    // Injects a "Deep Search" button next to the native MeshCentral search bar
    obj.injectDeepSearchButton = function () {
        // Prevent duplicate injections
        if (document.getElementById('btn-deep-search')) return;

        var existingFilter = document.getElementById('SearchInput');
        if (!existingFilter) return;

        var btn = document.createElement('button');
        btn.id = 'btn-deep-search';
        btn.innerHTML = '&#128269; Deep Search';
        // Styling matches MeshCentral's native look, supporting Light/Dark mode seamlessly
        btn.style.cssText = 'margin-left: 10px; padding: 4px 12px; border-radius: 3px; background-color: #007bff; color: white; border: none; cursor: pointer; font-weight: bold; font-size: 13px; height: 28px; vertical-align: middle;';
        
        btn.onmouseover = function() { this.style.backgroundColor = '#0056b3'; };
        btn.onmouseout = function() { this.style.backgroundColor = '#007bff'; };
        
        btn.onclick = function() {
            pluginHandler.deepsearch.showDeepSearchDialog();
        };

        // Insert the button directly after the native search input
        existingFilter.parentNode.insertBefore(btn, existingFilter.nextSibling);
    };

    // Opens the modal dialogue to perform the server-side deep search
    obj.showDeepSearchDialog = function () {
        if (document.getElementById('deepSearchOverlay')) return;

        // Create overlay background
        var overlay = document.createElement('div');
        overlay.id = 'deepSearchOverlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center;';
        
        // Detect Dark Mode for adaptive styling
        var isDark = document.body.classList.contains('dark-mode'); 
        var bgColor = isDark ? '#222' : '#fff';
        var textColor = isDark ? '#eee' : '#333';
        var borderColor = isDark ? '#444' : '#ddd';

        // Create Modal Window
        var modal = document.createElement('div');
        modal.style.cssText = 'background:' + bgColor + '; color:' + textColor + '; width:550px; max-width:90%; border-radius:8px; padding:20px; box-shadow:0 10px 25px rgba(0,0,0,0.5); display:flex; flex-direction:column; max-height:80vh;';

        var header = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid ' + borderColor + '; padding-bottom:10px;">' +
                     '<h3 style="margin:0;">Advanced Database Search</h3>' +
                     '<span style="cursor:pointer; font-size:24px; font-weight:bold; line-height:1;" onclick="pluginHandler.deepsearch.closeDeepSearch()">&times;</span>' +
                     '</div>';

        var inputArea = '<div style="display:flex; gap:10px; margin-bottom:15px;">' +
                        '<input type="text" id="deepSearchInput" placeholder="Enter IP, Username, MAC, or Description..." style="flex:1; padding:10px; border:1px solid ' + borderColor + '; border-radius:4px; background:transparent; color:' + textColor + ';" onkeydown="if(event.key === \'Enter\') pluginHandler.deepsearch.performDeepSearch()">' +
                        '<button onclick="pluginHandler.deepsearch.performDeepSearch()" style="background:#007bff; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:bold;">Search</button>' +
                        '</div>';

        var resultsArea = '<div id="deepSearchResults" style="flex:1; overflow-y:auto; border:1px solid ' + borderColor + '; border-radius:4px; padding:10px; background:rgba(128,128,128,0.05); min-height:250px;">' +
                          '<div style="opacity:0.6; text-align:center; margin-top:100px;">Results will appear here</div>' +
                          '</div>';

        modal.innerHTML = header + inputArea + resultsArea;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Auto-focus the input field
        setTimeout(function() { document.getElementById('deepSearchInput').focus(); }, 100);
    };

    obj.closeDeepSearch = function () {
        var overlay = document.getElementById('deepSearchOverlay');
        if (overlay) document.body.removeChild(overlay);
    };

    obj.performDeepSearch = function () {
        var query = document.getElementById('deepSearchInput').value.trim();
        if (!query) return;

        document.getElementById('deepSearchResults').innerHTML = '<div style="text-align:center; margin-top:100px; font-weight:bold; opacity:0.8;">Searching database...</div>';

        try {
            var sender = (typeof meshserver !== 'undefined') ? meshserver : ((typeof server !== 'undefined') ? server : null);
            if (sender) {
                sender.send({ 
                    action: 'plugin', 
                    plugin: 'deepsearch', 
                    pluginaction: 'doSearch', 
                    query: query
                });
            } else {
                throw new Error("WebSocket object not found.");
            }
        } catch (err) {
            document.getElementById('deepSearchResults').innerHTML = '<div style="color:#d9534f; text-align:center; margin-top:100px;">Error sending request: ' + err.message + '</div>';
        }
    };

    obj.loadSearchResults = function (serverObj, msg) {
        var resultsDiv = document.getElementById('deepSearchResults');
        if (!resultsDiv) return;

        if (msg.error) {
            resultsDiv.innerHTML = '<div style="color:#d9534f; text-align:center; margin-top:100px; font-weight:bold;">Error: ' + pluginHandler.deepsearch.esc(msg.errorMessage) + '</div>';
            return;
        }

        if (!msg || !msg.data || msg.data.length === 0) {
            resultsDiv.innerHTML = '<div style="text-align:center; margin-top:100px; opacity:0.7;">No matching devices found.</div>';
            return;
        }

        var html = '<div style="margin-bottom:12px; font-weight:bold; opacity:0.8;">Found ' + msg.data.length + ' device(s):</div>';
        
        for (var i = 0; i < msg.data.length; i++) {
            var device = msg.data[i];
            var isDark = document.body.classList.contains('dark-mode');
            var itemBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
            var itemBorder = isDark ? '#444' : '#eee';

            html += '<div style="padding:12px; margin-bottom:10px; border:1px solid ' + itemBorder + '; border-radius:5px; background:' + itemBg + '; display:flex; justify-content:space-between; align-items:center;">' +
                    '<div>' +
                    '<div style="font-weight:bold; font-size:15px; color:#007bff;">' + pluginHandler.deepsearch.esc(device.name) + '</div>' +
                    '<div style="font-size:12px; opacity:0.8; margin-top:4px;">Match: ' + pluginHandler.deepsearch.esc(device.reason) + '</div>' +
                    '</div>' +
                    '<button onclick="window.location.href=\'?id=' + device._id + '\'; pluginHandler.deepsearch.closeDeepSearch();" style="background:#28a745; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:13px; font-weight:bold;">Go to Device</button>' +
                    '</div>';
        }

        resultsDiv.innerHTML = html;
    };

    // Helper function to safely escape special characters in user input/output
    obj.esc = function (s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    // ==========================================
    // Part 2: Server-Side Code (Database Query)
    // ==========================================

    obj.serveraction = function(command, myparent, grandparent) {
        if (command.plugin !== 'deepsearch') return;

        if (command.pluginaction === 'doSearch') {
            var query = (command.query || '').toLowerCase().trim();
            
            // Helper function to transmit results directly back to the requesting admin
            var replyToClient = function(dataArray, isError, errorMsg) {
                try {
                    if (myparent && typeof myparent.send === 'function') {
                        myparent.send(JSON.stringify({
                            action: 'plugin',
                            plugin: 'deepsearch',
                            method: 'loadSearchResults',
                            data: dataArray || [],
                            error: !!isError,
                            errorMessage: errorMsg || ''
                        }));
                    }
                } catch (e) {
                    console.log('Deep Search reply error:', e);
                }
            };

            if (!query) {
                replyToClient([], false, "");
                return;
            }

            try {
                // Fetch all nodes directly from the MeshCentral MongoDB/NeDB datastore
                if (obj.meshServer && obj.meshServer.db && typeof obj.meshServer.db.GetAllType === 'function') {
                    obj.meshServer.db.GetAllType('node', function (err, allNodes) {
                        
                        if (err || !allNodes) {
                            replyToClient([], true, "Database read failed.");
                            return;
                        }

                        var results = [];
                        // Check if the requesting user has full site administrator privileges
                        var isSiteAdmin = (myparent.user && myparent.user.siteadmin == 0xFFFFFFFF);

                        for (var i = 0; i < allNodes.length; i++) {
                            var node = allNodes[i];
                            
                            // Security Gate: Only search nodes the current user is permitted to see
                            if (!isSiteAdmin) {
                                if (!myparent.user || !myparent.user.links || !myparent.user.links[node.meshid]) continue;
                            }

                            var match = false;
                            var matchReason = '';

                            // 1. Search by Device Name
                            if (node.name && node.name.toLowerCase().indexOf(query) !== -1) {
                                match = true; matchReason = 'Device Name';
                            }

                            // 2. Search by Device Description
                            if (!match && node.desc && node.desc.toLowerCase().indexOf(query) !== -1) {
                                match = true; matchReason = 'Description';
                            }
                            
                            // 3. Search by Logged-in Users
                            if (!match && node.users) {
                                for (var u = 0; u < node.users.length; u++) {
                                    if (node.users[u] && node.users[u].toLowerCase().indexOf(query) !== -1) {
                                        match = true; matchReason = 'Logged-in User (' + node.users[u] + ')';
                                        break;
                                    }
                                }
                            }

                            // 4. Search by Connection Public IP
                            if (!match && node.conn && node.conn.ip) {
                                if (node.conn.ip.toLowerCase().indexOf(query) !== -1) {
                                    match = true; matchReason = 'Public IP (' + node.conn.ip + ')';
                                }
                            }

                            // 5. Search by Local IPs / MAC Addresses (Deep Search within netinfo object)
                            if (!match && node.netinfo) {
                                var netStr = JSON.stringify(node.netinfo).toLowerCase();
                                if (netStr.indexOf(query) !== -1) {
                                    match = true; matchReason = 'Network Interface (Local IP / MAC)';
                                }
                            }

                            if (match) {
                                results.push({
                                    _id: node._id,
                                    name: node.name,
                                    reason: matchReason
                                });
                            }
                        }

                        replyToClient(results, false, "");
                    });
                } else {
                    replyToClient([], true, "Database function GetAllType not found. Plugin may need an update.");
                }
            } catch (ex) {
                console.log('Deep Search Plugin Error:', ex);
                replyToClient([], true, "Server exception: " + ex.message);
            }
        }
    };

    return obj;
};
