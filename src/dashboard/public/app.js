// Load inbox on page load
let currentMessageId = null;

async function loadInbox(preserveSelection = true) {
    try {
        const res = await fetch('/api/inbox');
        const data = await res.json();

        updateInboxList(data.messages);
        updateStats(data);

        // If we have a selected message, make sure it's highlighted/marked as active
        if (preserveSelection && currentMessageId) {
            highlightMessage(currentMessageId);
        }
    } catch (err) {
        console.error('Failed to load inbox:', err);
    }
}

function updateInboxList(messages) {
    const list = document.getElementById('inbox-list');

    if (messages.length === 0) {
        list.innerHTML = `
            <div class="text-center text-gray-600 py-8">
                No messages found
            </div>
        `;
        return;
    }

    // Sort by timestamp descending
    messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    list.innerHTML = messages.map(msg => `
        <div id="msg-${msg.id}" 
             class="message-item p-4 rounded-lg cursor-pointer border border-transparent hover:border-gray-700 hover:bg-gray-800 transition-all group ${!msg.read ? 'bg-gray-800/50 border-gray-700' : ''}"
             onclick="viewMessage('${msg.id}')">
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                    ${msg.encrypted ? '<span title="Encrypted">🔐</span>' : '<span title="Cleartext">📨</span>'}
                    <span class="font-medium text-gray-200 ${!msg.read ? 'text-white' : ''}">${msg.sender}</span>
                </div>
                ${!msg.read ? '<span class="w-2 h-2 rounded-full bg-blue-500"></span>' : ''}
            </div>
            <div class="text-sm font-medium ${!msg.read ? 'text-gray-100' : 'text-gray-400'} truncate mb-0.5">
                ${msg.subject || '(no subject)'}
            </div>
            <div class="text-xs text-gray-500">
                ${new Date(msg.createdAt).toLocaleString()}
            </div>
        </div>
    `).join('');
}

async function viewMessage(id) {
    currentMessageId = id;
    highlightMessage(id);

    // Show loading state
    const detail = document.getElementById('message-detail');
    detail.innerHTML = '<div class="h-full flex items-center justify-center text-gray-500">Loading...</div>';

    try {
        const res = await fetch(`/api/message/${id}`);
        const msg = await res.json();

        renderMessageDetail(msg);

        // Mark as read if not already
        if (!msg.read) {
            await fetch(`/api/message/${id}/read`, { method: 'POST' });
            // Update local UI state immediately to feel responsive
            const item = document.getElementById(`msg-${id}`);
            if (item) {
                const indicator = item.querySelector('.bg-blue-500');
                if (indicator) indicator.remove();
                item.classList.remove('bg-gray-800/50', 'border-gray-700');
            }
        }

    } catch (err) {
        console.error('Failed to view message:', err);
        detail.innerHTML = '<div class="text-red-500">Failed to load message</div>';
    }
}

function highlightMessage(id) {
    // Remove active class from all
    document.querySelectorAll('.message-item').forEach(el => {
        el.classList.remove('ring-1', 'ring-purple-500', 'bg-gray-800');
    });
    // Add to current
    const el = document.getElementById(`msg-${id}`);
    if (el) {
        el.classList.add('ring-1', 'ring-purple-500', 'bg-gray-800');
    }
}

function renderMessageDetail(msg) {
    const detail = document.getElementById('message-detail');

    // Formatting body with basic protection against XSS (though innerText/textContent is better usually, here we might want some simple format)
    // For now simple whitespace preservation

    detail.innerHTML = `
        <div class="max-w-3xl mx-auto w-full anim-fade-in">
            <div class="mb-8 p-6 bg-gray-850 rounded-xl border border-gray-800">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <div class="text-sm text-gray-400 mb-1">From</div>
                        <div class="font-mono text-blue-400">${msg.sender}</div>
                    </div>
                     <div class="text-right">
                        <div class="text-sm text-gray-400 mb-1">Received</div>
                        <div class="text-gray-300">${new Date(msg.createdAt).toLocaleString()}</div>
                    </div>
                </div>
                
                <h1 class="text-2xl font-bold text-white mb-6 pt-4 border-t border-gray-800">${msg.subject || '(no subject)'}</h1>
                
                ${msg.encrypted && msg.decrypted ? `
                    <div class="bg-green-900/20 border border-green-900/50 text-green-400 px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 mb-4">
                        🔐 Encrypted Message (Successfully Decrypted)
                    </div>
                ` : ''}
                
                ${msg.encrypted && !msg.decrypted ? `
                     <div class="bg-red-900/20 border border-red-900/50 text-red-400 px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 mb-4">
                        🔒 Could not decrypt message
                    </div>
                ` : ''}
            </div>

            <div class="prose prose-invert max-w-none bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-sm">
                <p class="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">${escapeHtml(msg.body)}</p>
            </div>

            <div class="mt-8 flex gap-4 justify-end">
                <button onclick="archiveMessage('${msg.id}')" 
                        class="px-6 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2 font-medium border border-gray-700">
                    <span>📦</span> Archive
                </button>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function archiveMessage(id) {
    if (!confirm('Archive this message?')) return;

    try {
        await fetch(`/api/message/${id}/archive`, { method: 'POST' });

        // Clear detail view
        const detail = document.getElementById('message-detail');
        detail.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                <span class="text-6xl opacity-20">📦</span>
                <p>Message archived</p>
            </div>
        `;

        currentMessageId = null;
        loadInbox(false);
    } catch (err) {
        alert('Failed to archive message');
    }
}

function updateStats(data) {
    const unreadCount = data.messages.filter(m => !m.read).length;
    document.getElementById('stats').innerHTML = `
        <span class="mr-3">Total: <span class="text-white font-bold">${data.total}</span></span>
        <span class="${unreadCount > 0 ? 'text-blue-400 font-bold' : ''}">Unread: ${unreadCount}</span>
    `;

    // Update tab title
    document.title = unreadCount > 0 ? `(${unreadCount}) Myceliumail` : 'Myceliumail Dashboard';
}

// Initial load
loadInbox();

// Poll every 10 seconds for new messages
setInterval(() => loadInbox(true), 10000);
