"use strict";

module.exports.deepsearch = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.meshServer = parent.parent;

    // Functions exposed to the frontend browser
    obj.exports = ['onDeviceRefreshEnd', 'showDeepSearchDialog', 'performDeepSearch', 'loadSearchResults', 'closeDeepSearch', 'esc'];

    obj.server_startup = function () {
        console.log('Deep Search plugin loaded on server.');
    };

    // ==========================================
    // Part 1: Client-Side Code (Injected into browser)
    // ==========================================
    
    obj.onDeviceRefreshEnd = function () {
        // Inject a Floating Action Button (FAB) globally if it doesn't already exist
        if (!document.getElementById('deepSearchFab')) {
            var fab = document.createElement('div');
            fab.id = 'deepSearchFab';
            fab.innerHTML = '&#128269; Deep Search';
            fab.style.cssText = 'position:fixed; bottom:20px; right:20px; background-color:#007bff; color:white; padding:12px 20px; border-radius:30px; cursor:pointer; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.3); z-index:9999; transition:background-color 0.3s;';
            fab.onmouseover = function() { this.style.backgroundColor = '#0056b3'; };
            fab.onmouseout = function() { this.style.backgroundColor = '#007bff'; };
            
            // Open dialog on click
            fab.onclick = function() {
                if (pluginHandler.deepsearch && pluginHandler.deepsearch.showDeepSearchDialog) {
                    pluginHandler.deepsearch.showDeepSearchDialog(null);
                }
            };
            document.body.appendChild(fab);
        }
    };

    obj.showDeepSearchDialog = function (serverObj) {
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
                     '<h3 style="margin:0;">Deep Search</h3>' +
                     '<span style="cursor:pointer; font-size:24px; font-weight:bold; line-height:1;" onclick="pluginHandler.deepsearch.closeDeepSearch(null)">&times;</span>' +
                     '</div>';

        var inputArea = '<div style="display:flex; gap:10px; margin-bottom:15px;">' +
                        '<input type="text" id="deepSearchInput" placeholder="Enter Local IP, Public IP, or Username..." style="flex:1; padding:10px; border:1px solid ' + borderColor + '; border-radius:4px; background:transparent; color:' + textColor + ';" onkeydown="if(event.key === \'Enter\') pluginHandler.deepsearch.performDeepSearch(null)">' +
                        '<button onclick="pluginHandler.deepsearch.performDeepSearch(null)" style="background:#007bff; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:bold;">Search</button>' +
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

    obj.closeDeepSearch = function (serverObj) {
        var overlay = document.getElementById('deepSearchOverlay');
        if (overlay) document.body.removeChild(overlay);
    };

    obj.performDeepSearch = function (serverObj) {
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
            document.getElementById('deepSearchResults').innerHTML = '<div style="color:#d9534f; text-align:center; margin-top:100px;">Error sending request</div>';
        }
    };

    obj.loadSearchResults = function (serverObj, msg) {
        var resultsDiv = document.getElementById('deepSearchResults');
        if (!resultsDiv) return;

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
                    '<button onclick="window.location.href=\'?id=' + device._id + '\'; pluginHandler.deepsearch.closeDeepSearch(null);" style="background:#28a745; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:13px; font-weight:bold;">Go to Device</button>' +
                    '</div>';
        }

        resultsDiv.innerHTML = html;
    };

    // Helper function to escape special characters safely
    obj.esc = function (s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    // ==========================================
    // Part 2: Server-Side Code (Database Search & Message Routing)
    // ==========================================

    obj.serveraction = function(command, myparent, grandparent) {
        if (command.plugin !== 'deepsearch') return;

        var sessionid = null;
        try { sessionid = myparent.ws.sessionId; } catch (e) {}
        var currentSessionid = command.sessionid || sessionid;

        if (command.pluginaction === 'doSearch') {
            var query = (command.query || '').toLowerCase().trim();
            if (!query) return;

            // Query the entire Node database securely
            obj.meshServer.db.GetAllTypeNodes('node', function (err, allNodes) {
                var results = [];
                if (err || !allNodes) {
                    sendResults(currentSessionid, results);
                    return;
                }

                // Check if the user is a full site administrator
                var isSiteAdmin = (myparent.user && myparent.user.siteadmin == 0xFFFFFFFF);

                for (var i = 0; i < allNodes.length; i++) {
                    var node = allNodes[i];
                    
                    // Security Check: Only search nodes the current user has access to
                    if (!isSiteAdmin) {
                        if (!myparent.user || !myparent.user.links || !myparent.user.links[node.meshid]) continue;
                    }

                    var match = false;
                    var matchReason = '';

                    // 1. Search by Device Name
                    if (node.name && node.name.toLowerCase().indexOf(query) !== -1) {
                        match = true; matchReason = 'Device Name';
                    }
                    
                    // 2. Search by Logged-in Users (node.users array)
                    if (!match && node.users) {
                        for (var u = 0; u < node.users.length; u++) {
                            if (node.users[u].toLowerCase().indexOf(query) !== -1) {
                                match = true; matchReason = 'Logged-in User (' + node.users[u] + ')';
                                break;
                            }
                        }
                    }

                    // 3. Search by Connection Public IP
                    if (!match && node.conn && node.conn.ip) {
                        if (node.conn.ip.toLowerCase().indexOf(query) !== -1) {
                            match = true; matchReason = 'Public IP (' + node.conn.ip + ')';
                        }
                    }

                    // 4. Search by Local IPs / MAC Addresses (Deep Search in netinfo object)
                    if (!match && node.netinfo) {
                        // Stringifying the object provides a robust fuzzy search across all network interfaces
                        var netStr = JSON.stringify(node.netinfo).toLowerCase();
                        if (netStr.indexOf(query) !== -1) {
                            match = true; matchReason = 'Local Network Interface (IP/MAC)';
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

                // Return search results back to the user's browser
                sendResults(currentSessionid, results);
            });
        }
    };

    function sendResults(targetSessionid, dataArray) {
        if (targetSessionid && obj.meshServer.webserver.wssessions2 && obj.meshServer.webserver.wssessions2[targetSessionid]) {
            try {
                obj.meshServer.webserver.wssessions2[targetSessionid].send(JSON.stringify({
                    action: 'plugin',
                    plugin: 'deepsearch',
                    method: 'loadSearchResults',
                    data: dataArray
                }));
            } catch (e) {
                console.log('Deep Search routing error:', e);
            }
        }
    }

    return obj;
};


