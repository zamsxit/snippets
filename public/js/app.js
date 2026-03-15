const API_URL = '/api';
// Hapus trailing slash di URL biar sistem gak bingung (ex: /dashboard/ jadi /dashboard)
const path = window.location.pathname.replace(/\/$/, '');
let currentSnippets = [];
let currentCategories = [];
let activeCategoryFilter = 'All';

const setupMobileMenu = () => {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if(btn && sidebar && overlay) {
        const toggleMenu = () => {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        };
        btn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    }
};

const showToast = (msg, type = 'success') => {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    const bgClass = type === 'error' ? 'bg-[#1a1a1a] border border-rose-500/50 text-rose-400' : 'bg-white text-black';
    toast.className = `fixed bottom-6 right-6 px-6 py-3.5 rounded-xl font-bold text-sm z-[100] shadow-2xl flex items-center gap-3 ${bgClass}`;
    toast.innerHTML = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
};

window.showConfirm = (title, message) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const box = document.getElementById('confirmBox');
        
        document.getElementById('confirmTitle').innerText = title;
        document.getElementById('confirmMessage').innerText = message;
        
        modal.classList.remove('hidden');
        setTimeout(() => box.classList.replace('scale-95', 'scale-100'), 10);

        const close = (result) => {
            box.classList.replace('scale-100', 'scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                resolve(result);
            }, 200);
        };

        document.getElementById('confirmCancelBtn').onclick = () => close(false);
        document.getElementById('confirmYesBtn').onclick = () => close(true);
    });
};

const req = async (endpoint, method = 'GET', body = null, headers = {}) => {
    try {
        const options = { method, headers: { 'Content-Type': 'application/json', ...headers } };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`${API_URL}${endpoint}`, options);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    } catch (err) {
        showToast(err.message, 'error');
        throw err;
    }
};

window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.replace('block', 'hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => {
        el.className = 'nav-btn w-full flex items-center gap-3 py-3.5 px-4 text-sm text-gray-400 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-all border border-transparent';
    });
    
    const targetTab = document.getElementById(`tab-${tabId}`);
    if(targetTab) targetTab.classList.replace('hidden', 'block');
    
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if(activeBtn) {
        activeBtn.className = 'nav-btn w-full flex items-center gap-3 py-3.5 px-4 text-sm text-white bg-white/10 rounded-xl font-bold transition-all border border-white/10 shadow-sm';
    }
    
    const headerTitle = document.getElementById('headerTitle');
    if(headerTitle) {
        const titles = { overview: 'Dashboard Overview', list: 'Code List', categories: 'Category Management', form: 'Snippet Editor' };
        headerTitle.innerText = titles[tabId] || 'Console';
    }
    
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if(sidebar && !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
        if(overlay) overlay.classList.add('hidden');
    }
};

const renderFilters = (categories) => {
    const container = document.getElementById('categoryFilters');
    if(!container) return;
    let html = `<button onclick="filterByCategory('All')" class="px-5 py-3 ${activeCategoryFilter === 'All' ? 'bg-white text-black' : 'bg-[#141414] border border-[#2a2a2a] text-gray-400 hover:text-white'} text-xs font-bold uppercase tracking-widest rounded-xl transition-all whitespace-nowrap">All</button>`;
    categories.forEach(c => {
        const isActive = activeCategoryFilter === c.name;
        html += `<button onclick="filterByCategory('${c.name}')" class="px-5 py-3 ${isActive ? 'bg-white text-black' : 'bg-[#141414] border border-[#2a2a2a] text-gray-400 hover:text-white'} text-xs font-bold uppercase tracking-widest rounded-xl transition-all whitespace-nowrap">${c.name}</button>`;
    });
    container.innerHTML = html;
};

window.filterByCategory = (cat) => {
    activeCategoryFilter = cat;
    renderFilters(currentCategories);
    const searchVal = (document.getElementById('desktopSearch')?.value || document.getElementById('mobileSearch')?.value || '').toLowerCase();
    let filtered = currentSnippets;
    if(cat !== 'All') filtered = filtered.filter(s => s.category === cat);
    if(searchVal) filtered = filtered.filter(s => s.title.toLowerCase().includes(searchVal) || s.category.toLowerCase().includes(searchVal));
    renderUserSnippets(filtered);
};

const renderUserSnippets = (snippets) => {
    const container = document.getElementById('snippetContainer');
    if (!container) return;
    container.innerHTML = snippets.map((s, i) => `
        <div class="group bg-[#141414] border border-[#2a2a2a] hover:border-[#4a4a4a] rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between fade-in shadow-xl" style="animation-delay: ${i * 0.05}s">
            <div>
                <div class="flex justify-between items-center mb-4">
                    <span class="px-3 py-1.5 rounded-lg text-[10px] font-extrabold text-white bg-[#2a2a2a] uppercase tracking-widest">${s.category}</span>
                    ${s.isLocked ? '<div class="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20"><span class="material-icons text-rose-500 text-[14px]">lock</span></div>' : ''}
                </div>
                <h3 class="text-xl font-extrabold tracking-tighter text-white mb-4 group-hover:text-blue-400 transition-colors">${s.title}</h3>
                <p class="text-[13px] text-gray-500 mb-6 line-clamp-2 font-medium leading-relaxed">${s.description}</p>
            </div>
            <a href="/snippet?id=${s.id}" class="inline-flex items-center justify-center w-full bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-white text-gray-300 hover:text-black py-3.5 rounded-xl transition-all duration-300 text-xs font-extrabold uppercase tracking-widest">
                View Source
            </a>
        </div>
    `).join('');
};

const initList = async () => {
    const [snippets, categories] = await Promise.all([req('/snippets'), req('/categories')]);
    currentSnippets = snippets;
    currentCategories = categories;
    renderFilters(categories);
    renderUserSnippets(snippets);
    const handleSearch = (e) => {
        const val = e.target.value.toLowerCase();
        let filtered = currentSnippets;
        if(activeCategoryFilter !== 'All') filtered = filtered.filter(s => s.category === activeCategoryFilter);
        filtered = filtered.filter(s => s.title.toLowerCase().includes(val) || s.category.toLowerCase().includes(val));
        renderUserSnippets(filtered);
    };
    const ds = document.getElementById('desktopSearch');
    const ms = document.getElementById('mobileSearch');
    if(ds) ds.addEventListener('input', handleSearch);
    if(ms) ms.addEventListener('input', handleSearch);
};

const initDetail = async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return window.location.href = '/snippets';
    const contentDiv = document.getElementById('detailContent');
    const modal = document.getElementById('passwordModal');
    const passInput = document.getElementById('snippetPassword');
    const loadContent = async (password = null) => {
        try {
            const data = await req('/snippets/detail', 'POST', { id, password });
            modal.classList.add('hidden');
            req(`/snippets/${id}/view`, 'POST').catch(()=>{});

            const fileKey = Object.keys(data.files)[0];
            const codeContent = data.files[fileKey].content;
            contentDiv.innerHTML = `
                <div class="fade-in mt-6">
                    <div class="mb-10 text-center">
                        <span class="inline-block mb-4 text-[10px] font-extrabold uppercase tracking-widest border border-[#2a2a2a] bg-[#1a1a1a] text-white px-4 py-2 rounded-xl">${data.category}</span>
                        <h1 class="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tighter">${data.title}</h1>
                        <p class="text-gray-500 text-sm md:text-base max-w-2xl mx-auto leading-relaxed font-medium">${data.description}</p>
                    </div>
                    <div class="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl">
                        <div class="bg-[#101010] border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 rounded-full bg-rose-500"></div>
                                <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                                <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                            </div>
                            <span class="text-xs font-mono text-gray-500 font-bold">${fileKey}</span>
                            <button id="copyBtn" class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2a2a2a] text-gray-400 hover:bg-white hover:text-black transition-colors"><span class="material-icons text-[16px]">content_copy</span></button>
                        </div>
                        <pre class="p-0 m-0 text-[13px] font-mono"><code id="codeBlock" class="!bg-[#141414] !p-8">${codeContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
                    </div>
                </div>
            `;
            if (window.hljs) hljs.highlightElement(document.getElementById('codeBlock'));
            document.getElementById('copyBtn').addEventListener('click', () => {
                navigator.clipboard.writeText(codeContent);
                showToast('Code copied to clipboard');
                req(`/snippets/${id}/copy`, 'POST').catch(()=>{});
            });
        } catch (err) {
            if (err.message.includes('Locked')) modal.classList.remove('hidden');
            else contentDiv.innerHTML = `<p class="text-center text-rose-500 font-mono py-10">System Error: File inaccessible.</p>`;
        }
    };
    document.getElementById('unlockBtn').addEventListener('click', () => loadContent(passInput.value));
    loadContent();
};

const initAdmin = () => {
    let adminKey = localStorage.getItem('zams_admin_key');

    const setupCustomDropdown = () => {
        const btn = document.getElementById('customDropdownBtn');
        const menu = document.getElementById('customDropdownMenu');
        const icon = document.getElementById('customDropdownIcon');
        const closeDropdown = () => {
            if(menu && !menu.classList.contains('hidden')){
                menu.classList.replace('opacity-100', 'opacity-0');
                setTimeout(() => menu.classList.add('hidden'), 200);
                if(icon) icon.classList.remove('rotate-180');
            }
        };
        if(btn) {
            btn.addEventListener('click', () => {
                if (menu.classList.contains('hidden')) {
                    menu.classList.remove('hidden');
                    setTimeout(() => menu.classList.replace('opacity-0', 'opacity-100'), 10);
                    if(icon) icon.classList.add('rotate-180');
                } else closeDropdown();
            });
        }
        document.addEventListener('click', (e) => {
            if(!e.target.closest('#categoryDropdownWrapper')) closeDropdown();
        });
        window.selectCategory = (name) => {
            document.getElementById('categorySelectValue').value = name;
            document.getElementById('customDropdownText').innerText = name;
            document.getElementById('customDropdownText').classList.replace('text-gray-400', 'text-white');
            closeDropdown();
        };
    };

    const renderAdminCategories = () => {
        const listUI = document.getElementById('categoryList');
        const dropList = document.getElementById('customDropdownList');
        const textBtn = document.getElementById('customDropdownText');
        const valInput = document.getElementById('categorySelectValue');
        const formBtn = document.getElementById('submitSnippetBtn');
        const warning = document.getElementById('noCategoryWarning');
        
        if(listUI) {
            listUI.innerHTML = currentCategories.map(c => `
                <li class="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors group">
                    <span class="text-sm font-bold text-white">${c.name}</span>
                    <button onclick="deleteCategory('${c.id}')" class="text-gray-500 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><span class="material-icons text-sm">delete</span></button>
                </li>
            `).join('');
        }

        if(dropList) {
            if(currentCategories.length === 0) {
                textBtn.innerText = 'No categories exist!';
                textBtn.classList.replace('text-white', 'text-gray-400');
                dropList.innerHTML = '';
                valInput.value = '';
                if(formBtn) { formBtn.disabled = true; formBtn.classList.replace('bg-white', 'bg-gray-600'); }
                if(warning) warning.classList.remove('hidden');
            } else {
                if(!valInput.value) {
                    textBtn.innerText = 'Select category...';
                    textBtn.classList.replace('text-white', 'text-gray-400');
                }
                dropList.innerHTML = currentCategories.map(c => `
                    <li class="px-4 py-3 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white cursor-pointer transition-colors" onclick="selectCategory('${c.name}')">${c.name}</li>
                `).join('');
                if(formBtn) { formBtn.disabled = false; formBtn.classList.replace('bg-gray-600', 'bg-white'); }
                if(warning) warning.classList.add('hidden');
            }
        }
    };

    const renderAdminTable = () => {
        let totalViews = 0;
        let totalCopies = 0;
        currentSnippets.forEach(s => {
            totalViews += (s.views || 0);
            totalCopies += (s.copies || 0);
        });

        const safeSet = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        safeSet('statTotal', currentSnippets.length);
        safeSet('statLocked', currentSnippets.filter(s => s.isLocked).length);
        safeSet('statCats', currentCategories.length);
        safeSet('statViews', totalViews);
        safeSet('statCopies', totalCopies);

        const tbody = document.getElementById('adminTableBody');
        if(!tbody) return;
        tbody.innerHTML = currentSnippets.map(s => `
            <tr class="hover:bg-[#1a1a1a] transition-colors group">
                <td class="p-5 w-1/3">
                    <p class="text-white font-bold text-sm mb-1">${s.title}</p>
                    <p class="text-gray-500 text-[11px] truncate max-w-[150px] md:max-w-xs">${s.description}</p>
                </td>
                <td class="p-5"><span class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-gray-300 bg-[#2a2a2a] uppercase tracking-widest">${s.category}</span></td>
                <td class="p-5">
                    <div class="flex items-center gap-3 text-gray-400 text-xs font-mono">
                        <span class="flex items-center gap-1" title="Views"><span class="material-icons text-[14px]">visibility</span> ${s.views || 0}</span>
                        <span class="flex items-center gap-1" title="Copies"><span class="material-icons text-[14px]">content_copy</span> ${s.copies || 0}</span>
                    </div>
                </td>
                <td class="p-5">
                    ${s.isLocked 
                        ? '<span class="inline-flex items-center gap-1 text-rose-500 text-[10px] font-bold uppercase tracking-widest"><span class="material-icons text-[14px]">lock</span></span>' 
                        : '<span class="inline-flex items-center gap-1 text-emerald-500 text-[10px] font-bold uppercase tracking-widest"><span class="material-icons text-[14px]">public</span></span>'}
                </td>
                <td class="p-5 text-right">
                    <div class="flex justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editSnippet('${s.id}')" class="w-8 h-8 rounded-lg bg-[#2a2a2a] hover:bg-white text-gray-400 hover:text-black flex items-center justify-center transition-colors"><span class="material-icons text-[14px]">edit</span></button>
                        <button onclick="deleteSnippet('${s.id}')" class="w-8 h-8 rounded-lg bg-[#2a2a2a] hover:bg-rose-500 text-gray-400 hover:text-white flex items-center justify-center transition-colors"><span class="material-icons text-[14px]">delete</span></button>
                    </div>
                </td>
            </tr>
        `).join('');
    };

    const loadAdminData = async () => {
        try {
            const [snippets, categories] = await Promise.all([req('/snippets'), req('/categories')]);
            currentSnippets = snippets || [];
            currentCategories = categories || [];
            renderAdminCategories();
            renderAdminTable();
        } catch (err) {
            showToast('Failed to sync database records', 'error');
        }
    };

    const checkAuth = async () => {
        if (!adminKey) {
            if(path.includes('/zamsxit/dashboard')) window.location.href = '/zamsxit/login';
            return;
        }
        try {
            await req('/auth', 'POST', { secretKey: adminKey });
            if(path.includes('/zamsxit/login')) window.history.pushState({}, '', '/zamsxit/dashboard');
            
            document.getElementById('loginSection').classList.replace('flex', 'hidden');
            document.getElementById('dashboardSection').classList.replace('hidden', 'flex');
            
            switchTab('overview');
            await loadAdminData(); // Menunggu proses data selesai
            setupCustomDropdown();
        } catch { 
            localStorage.removeItem('zams_admin_key'); 
            if(path.includes('/zamsxit/dashboard')) window.location.href = '/zamsxit/login';
        }
    };

    document.getElementById('loginBtn').addEventListener('click', async () => {
        const key = document.getElementById('adminKey').value;
        try {
            await req('/auth', 'POST', { secretKey: key });
            localStorage.setItem('zams_admin_key', key);
            adminKey = key;
            checkAuth();
        } catch { showToast('Invalid Protocol Key', 'error'); }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('zams_admin_key');
        window.location.href = '/zamsxit/login';
    });

    const catForm = document.getElementById('addCategoryForm');
    if(catForm) {
        catForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newCategoryName').value;
            try {
                await req('/categories', 'POST', { name }, { 'x-admin-key': adminKey });
                showToast('Category Created');
                catForm.reset();
                loadAdminData();
            } catch(err) { showToast(err.message, 'error'); }
        });
    }

    window.deleteCategory = async (id) => {
        const confirmed = await showConfirm('Delete Category', 'Delete this category? Snippets using it may lose their tag.');
        if(!confirmed) return;
        try {
            await req(`/categories/${id}`, 'DELETE', null, { 'x-admin-key': adminKey });
            showToast('Category Deleted');
            loadAdminData();
        } catch { showToast('Deletion Failed', 'error'); }
    };

    window.resetForm = () => {
        document.getElementById('snippetEditorForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('editGistId').value = '';
        document.getElementById('categorySelectValue').value = '';
        document.getElementById('customDropdownText').innerText = 'Select category...';
        document.getElementById('customDropdownText').classList.replace('text-white', 'text-gray-400');
        document.getElementById('formTitle').innerText = 'Snippet Editor';
    };

    window.editSnippet = async (id) => {
        try {
            const data = await req('/snippets/detail', 'POST', { id, password: '' }, { 'x-admin-key': adminKey });
            document.getElementById('editId').value = data.id || id;
            document.getElementById('editGistId').value = data.gistId;
            document.getElementById('title').value = data.title;
            document.getElementById('description').value = data.description;
            document.getElementById('password').value = data.password || '';
            const fileKey = Object.keys(data.files)[0];
            document.getElementById('filename').value = fileKey;
            document.getElementById('code').value = data.files[fileKey].content;
            selectCategory(data.category);
            document.getElementById('formTitle').innerText = 'Update Record';
            switchTab('form');
        } catch (err) {
            showToast('Failed to fetch snippet data.', 'error');
        }
    };

    const snipForm = document.getElementById('snippetEditorForm');
    if(snipForm) {
        snipForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('editId').value;
            const payload = {
                title: document.getElementById('title').value,
                category: document.getElementById('categorySelectValue').value,
                filename: document.getElementById('filename').value,
                description: document.getElementById('description').value,
                code: document.getElementById('code').value,
                password: document.getElementById('password').value || null,
                gistId: document.getElementById('editGistId').value
            };
            if(!payload.category) return showToast('Please select a category!', 'error');
            try {
                if (editId) {
                    await req(`/snippets/${editId}`, 'PUT', payload, { 'x-admin-key': adminKey });
                    showToast('Record Updated');
                } else {
                    await req('/snippets', 'POST', payload, { 'x-admin-key': adminKey });
                    showToast('Code Deployed');
                }
                resetForm();
                loadAdminData();
                switchTab('list');
            } catch (err) { showToast('Execution Failed', 'error'); }
        });
    }

    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    if(togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const pwInput = document.getElementById('password');
            const pwIcon = document.getElementById('togglePasswordIcon');
            if (pwInput.type === 'password') {
                pwInput.type = 'text';
                pwIcon.innerText = 'visibility';
            } else {
                pwInput.type = 'password';
                pwIcon.innerText = 'visibility_off';
            }
        });
    }

    window.deleteSnippet = async (id) => {
        const confirmed = await showConfirm('Execute Deletion', 'Execute deletion protocol? This cannot be undone.');
        if(!confirmed) return;
        try {
            await req(`/snippets/${id}`, 'DELETE', null, { 'x-admin-key': adminKey });
            showToast('Record Purged');
            loadAdminData();
        } catch { showToast('Deletion Failed', 'error'); }
    };

    checkAuth();
};

document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    // Path logic diperbarui biar URL dengan garis miring gak bikin aplikasi pingsan
    if (path.endsWith('/snippets') || path.endsWith('snippets.html')) initList();
    else if (path.endsWith('/snippet') || path.endsWith('detail.html')) initDetail();
    else if (path.includes('/zamsxit/login') || path.includes('/zamsxit/dashboard') || path.includes('admin.html')) initAdmin();
});