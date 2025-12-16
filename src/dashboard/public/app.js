// Load inbox on page load
let currentMessageId = null;
let currentAgentId = 'treebird'; // Default viewer identity

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

    list.innerHTML = messages.map(msg => {
        const isUnread = !msg.read && (!msg.readBy || !msg.readBy.includes(currentAgentId));
        return `
        <div id="msg-${msg.id}" 
             class="message-item p-4 rounded-lg cursor-pointer border border-transparent hover:border-gray-700 hover:bg-gray-800 transition-all group ${isUnread ? 'bg-gray-800/50 border-gray-700' : ''}"
             onclick="viewMessage('${msg.id}')">
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                    ${msg.encrypted ? '<span title="Encrypted">🔐</span>' : '<span title="Cleartext">📨</span>'}
                    <span class="font-medium text-gray-200 ${isUnread ? 'text-white' : ''}">${msg.sender}</span>
                    <span class="text-gray-500 text-sm">→ ${msg.recipient}</span>
                </div>
                ${isUnread ? '<span class="w-2 h-2 rounded-full bg-blue-500"></span>' : ''}
            </div>
            <div class="text-base font-medium ${isUnread ? 'text-gray-100' : 'text-gray-400'} truncate mb-0.5">
                ${msg.subject || '(no subject)'}
            </div>
            <div class="text-sm text-gray-500">
                ${new Date(msg.createdAt).toLocaleString()}
            </div>
        </div>
    `}).join('');
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

        // Mark as read for current agent
        if (!msg.readBy || !msg.readBy.includes(currentAgentId)) {
            await fetch(`/api/message/${id}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ readerId: currentAgentId })
            });
            // Update local UI state immediately
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

    detail.innerHTML = `
        <div class="max-w-4xl mx-auto w-full anim-fade-in">
            <div class="mb-8 p-6 bg-gray-850 rounded-xl border border-gray-800">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <div class="text-base text-gray-400 mb-1">From</div>
                        <div class="font-mono text-xl text-blue-400">${msg.sender}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-base text-gray-400 mb-1">To</div>
                        <div class="font-mono text-xl text-green-400">${msg.recipient}</div>
                    </div>
                     <div class="text-right">
                        <div class="text-base text-gray-400 mb-1">Received</div>
                        <div class="text-lg text-gray-300">${new Date(msg.createdAt).toLocaleString()}</div>
                    </div>
                </div>
                
                <h1 class="text-3xl font-bold text-white mb-6 pt-4 border-t border-gray-800">${msg.subject || '(no subject)'}</h1>
                
                ${msg.encrypted && msg.decrypted ? `
                    <div class="bg-green-900/20 border border-green-900/50 text-green-400 px-3 py-2 rounded-lg text-base inline-flex items-center gap-2 mb-4">
                        🔐 Decrypted by: ${msg.decryptedBy || 'unknown'}
                    </div>
                ` : ''}
                
                ${msg.encrypted && !msg.decrypted ? `
                     <div class="bg-red-900/20 border border-red-900/50 text-red-400 px-3 py-2 rounded-lg text-base inline-flex items-center gap-2 mb-4">
                        🔒 Could not decrypt message
                    </div>
                ` : ''}
            </div>

            <div class="prose prose-invert max-w-none bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-sm">
                <p class="whitespace-pre-wrap font-sans text-xl text-gray-300 leading-relaxed">${escapeHtml(msg.body)}</p>
            </div>

            ${msg.attachments && msg.attachments.length > 0 ? `
            <!-- Attachments -->
            <div class="mt-6 bg-gray-900 p-6 rounded-xl border border-gray-800">
                <h3 class="text-lg font-semibold text-gray-300 mb-4">📎 Attachments (${msg.attachments.length})</h3>
                <div class="space-y-3">
                    ${msg.attachments.map((att, i) => `
                        <div class="flex items-center justify-between bg-gray-850 p-4 rounded-lg border border-gray-700">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">${getFileIcon(att.type)}</span>
                                <div>
                                    <div class="text-white font-medium">${escapeHtml(att.name)}</div>
                                    <div class="text-sm text-gray-500">${formatFileSize(att.size)}</div>
                                </div>
                            </div>
                            <button onclick='downloadAttachment(${JSON.stringify(att.name)}, ${JSON.stringify(att.type)}, ${JSON.stringify(att.data)})'
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-lg">
                                ⬇️ Download
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Action Buttons -->
            <div class="mt-8 flex gap-4 justify-between">
                <div class="flex gap-3">
                    <button onclick="showReplyForm('${msg.id}', '${msg.sender}')" 
                            class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center gap-2 font-medium text-lg">
                        <span>↩️</span> Reply
                    </button>
                    <button onclick="forwardMessage('${msg.id}')" 
                            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2 font-medium text-lg">
                        <span>➡️</span> Forward
                    </button>
                </div>
                <div class="flex gap-3">
                    <button onclick="archiveMessage('${msg.id}')" 
                            class="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2 font-medium border border-gray-700 text-lg">
                        <span>📦</span> Archive
                    </button>
                    <button onclick="deleteMessage('${msg.id}')" 
                            class="px-6 py-3 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-800 hover:text-white transition-colors flex items-center gap-2 font-medium border border-red-900/50 text-lg">
                        <span>🗑️</span> Delete
                    </button>
                </div>
            </div>
            
            <!-- Reply Form (hidden by default) -->
            <div id="reply-form" class="hidden mt-8 bg-gray-850 p-6 rounded-xl border border-gray-800">
                <h3 class="text-xl font-bold mb-4">Reply to <span id="reply-to"></span></h3>
                <div class="mb-4">
                    <label class="block text-gray-400 mb-2 text-lg">From (your agent ID):</label>
                    <input type="text" id="reply-from" value="${currentAgentId}" 
                           class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-lg text-white focus:border-purple-500 focus:outline-none">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-400 mb-2 text-lg">Message:</label>
                    <textarea id="reply-body" rows="6" 
                              class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-lg text-white focus:border-purple-500 focus:outline-none resize-none"></textarea>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-400 mb-2 text-lg">Attach Files (max 5MB each):</label>
                    <input type="file" id="reply-files" multiple 
                           class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer">
                    <div id="file-list" class="mt-2 text-sm text-gray-400"></div>
                </div>
                <div class="flex gap-4 justify-end">
                    <button onclick="hideReplyForm()" 
                            class="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-lg">Cancel</button>
                    <button onclick="sendReply()" 
                            class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-medium text-lg">Send Reply</button>
                </div>
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

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix to get just base64
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function downloadAttachment(name, type, data) {
    const link = document.createElement('a');
    link.href = `data:${type};base64,${data}`;
    link.download = name;
    link.click();
}

function getFileIcon(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    if (mimeType.includes('text')) return '📝';
    if (mimeType.includes('json') || mimeType.includes('javascript')) return '💻';
    return '📄';
}

let replyToRecipient = '';
let replyToSubject = '';

function showReplyForm(msgId, sender) {
    replyToRecipient = sender;
    const currentMsg = document.querySelector('h1').textContent;
    replyToSubject = currentMsg.startsWith('Re:') ? currentMsg : `Re: ${currentMsg}`;

    document.getElementById('reply-to').textContent = sender;
    document.getElementById('reply-form').classList.remove('hidden');
    document.getElementById('reply-body').focus();
}

function hideReplyForm() {
    document.getElementById('reply-form').classList.add('hidden');
}

async function sendReply() {
    const from = document.getElementById('reply-from').value;
    const body = document.getElementById('reply-body').value;
    const fileInput = document.getElementById('reply-files');

    if (!body.trim()) {
        alert('Please enter a message');
        return;
    }

    // Process attachments
    const attachments = [];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    if (fileInput && fileInput.files.length > 0) {
        for (const file of fileInput.files) {
            if (file.size > MAX_SIZE) {
                alert(`File "${file.name}" exceeds 5MB limit`);
                return;
            }

            const base64 = await readFileAsBase64(file);
            attachments.push({
                name: file.name,
                type: file.type || 'application/octet-stream',
                data: base64,
                size: file.size
            });
        }
    }

    try {
        await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: replyToRecipient,
                subject: replyToSubject,
                body: body,
                from: from,
                attachments: attachments.length > 0 ? attachments : undefined
            })
        });

        hideReplyForm();
        alert('Reply sent!' + (attachments.length > 0 ? ` (${attachments.length} attachment(s))` : ''));
        loadInbox(true);
    } catch (err) {
        alert('Failed to send reply');
    }
}

async function forwardMessage(id) {
    const recipient = prompt('Forward to (agent ID):');
    if (!recipient) return;

    try {
        const res = await fetch(`/api/message/${id}`);
        const msg = await res.json();

        const from = prompt('Your agent ID:', currentAgentId);
        if (!from) return;

        await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: recipient,
                subject: `Fwd: ${msg.subject || '(no subject)'}`,
                body: `---------- Forwarded message ----------\nFrom: ${msg.sender}\nTo: ${msg.recipient}\n\n${msg.body}`,
                from: from
            })
        });

        alert('Message forwarded!');
    } catch (err) {
        alert('Failed to forward message');
    }
}

async function deleteMessage(id) {
    if (!confirm('Delete this message permanently?')) return;

    try {
        await fetch(`/api/message/${id}`, { method: 'DELETE' });

        // Clear detail view
        const detail = document.getElementById('message-detail');
        detail.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                <span class="text-6xl opacity-20">🗑️</span>
                <p>Message deleted</p>
            </div>
        `;

        currentMessageId = null;
        loadInbox(false);
    } catch (err) {
        alert('Failed to delete message');
    }
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
    const unreadCount = data.messages.filter(m => !m.read && (!m.readBy || !m.readBy.includes(currentAgentId))).length;
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
