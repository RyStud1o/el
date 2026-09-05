// ==========================================
// SISTEM KEAMANAN (ANTI INSPECT & COPY)
// ==========================================
document.addEventListener('contextmenu', event => event.preventDefault());

document.onkeydown = function(e) {
  if(e.keyCode == 123) return false; // F12
  if(e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) return false; // Ctrl+Shift+I/J/C
  if(e.ctrlKey && e.keyCode === 85) return false; // Ctrl+U
};

// =========================================================
// ECOLENS CORE SYSTEM - ENTERPRISE LEVEL ARCHITECTURE
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, getDocs, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDlcNlc6jCdQ33xlRCREkQy_sVIm0e8TLU",
    authDomain: "bio-trace.firebaseapp.com",
    projectId: "bio-trace",
    storageBucket: "bio-trace.firebasestorage.app",
    messagingSenderId: "457891276480",
    appId: "1:457891276480:web:894b57d3a03c6a92bb6f25",
    measurementId: "G-D8367N5V5S"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 0. SPLASH SCREEN & WELCOME POPUP (5 DETIK)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                showModal("Halo, Selamat Datang! 🌿", "Salam hangat dari tim EcoLens! Terima kasih banyak telah menggunakan aplikasi monitoring keanekaragaman hayati ini. Mari bersama menjaga keberlanjutan bumi kita tercinta.");
            }, 500);
        }
    }, 5000); 
});

// ==========================================
// 1. UI & ROUTING MANAGER
// ==========================================
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('navMenu').classList.toggle('show');
});

window.switchTab = function(tabId, element = null) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    
    if (tabId === 'admin-login-tab' && auth.currentUser) {
        document.getElementById('admin-dashboard-tab').classList.add('active');
    } else {
        document.getElementById(tabId).classList.add('active');
    }
    
    if (element) {
        element.classList.add('active');
    } else {
        const targetLi = Array.from(document.querySelectorAll('.nav-links li')).find(li => li.getAttribute('onclick').includes(tabId));
        if(targetLi) targetLi.classList.add('active');
    }

    if(tabId === 'home-tab') {
        setTimeout(() => {
            map.invalidateSize();
        }, 150);
    }
    document.getElementById('navMenu').classList.remove('show');
};

window.showModal = function(title, message, isSuccess = true) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMessage').innerText = message;
    const iconHTML = isSuccess 
        ? '<i class="fa-solid fa-circle-check" style="color: var(--color-brand);"></i>' 
        : '<i class="fa-solid fa-circle-exclamation" style="color: var(--color-danger);"></i>';
    document.getElementById('modalIcon').innerHTML = iconHTML;
    
    document.getElementById('modalActions').innerHTML = `
        <button class="btn btn-primary w-100" onclick="closeModal()">Tutup</button>
    `;
    
    document.getElementById('customModal').style.display = 'flex';
};

// POPUP KONFIRMASI KUSTOM (Menggantikan confirm() bawaan browser)
window.showConfirmModal = function(title, message, onConfirmCallback) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMessage').innerText = message;
    document.getElementById('modalIcon').innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--color-danger);"></i>';
    
    document.getElementById('modalActions').innerHTML = `
        <button class="btn btn-outline w-100" onclick="closeModal()">Batal</button>
        <button class="btn btn-danger w-100" id="modalConfirmBtn">Hapus</button>
    `;
    
    document.getElementById('modalConfirmBtn').onclick = function() {
        closeModal();
        onConfirmCallback();
    };
    
    document.getElementById('customModal').style.display = 'flex';
};

window.closeModal = () => document.getElementById('customModal').style.display = 'none';

// ==========================================
// 2. JAM REAL-TIME WITA & LOKASI
// ==========================================
function setWitaTime() {
    const input = document.getElementById('tanggal');
    if (!input) return;
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wita = new Date(utc + (3600000 * 8));
    
    const fmt = (n) => String(n).padStart(2, '0');
    input.value = `${wita.getFullYear()}-${fmt(wita.getMonth()+1)}-${fmt(wita.getDate())}T${fmt(wita.getHours())}:${fmt(wita.getMinutes())}`;
}
setInterval(setWitaTime, 1000);
setWitaTime();

document.getElementById('btnLokasi').addEventListener('click', () => {
    const input = document.getElementById('lokasi');
    input.value = "Menganalisis koordinat satelit...";
    navigator.geolocation.getCurrentPosition(
        (pos) => input.value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
        (err) => { showModal("Akses Ditolak", "Harap izinkan akses GPS di pengaturan browser Anda.", false); input.value = ""; },
        { enableHighAccuracy: true } 
    );
});

// ==========================================
// 3. INISIASI PETA (OpenStreetMap Murni)
// ==========================================
const map = L.map('map').setView([-3.0086, 114.3888], 9); 
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// ==========================================
// 4. SISTEM KAMERA & KOMPRESI
// ==========================================
let compressedImgData = "";
document.getElementById('foto').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDimension = 800; 
            let width = img.width, height = img.height;
            
            if (width > height && width > maxDimension) {
                height *= maxDimension / width; width = maxDimension;
            } else if (height > maxDimension) {
                width *= maxDimension / height; height = maxDimension;
            }
            
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            
            compressedImgData = canvas.toDataURL('image/jpeg', 0.7); 
            document.getElementById('previewFoto').src = compressedImgData;
            document.getElementById('previewBox').style.display = 'block';
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

// ==========================================
// 5. MANAJEMEN DRAFT (Lokal)
// ==========================================
document.getElementById('bioForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    
    if (!editId && !compressedImgData) return showModal("Validasi Gagal", "Harap ambil atau unggah foto spesies.", false);

    const formData = {
        id: editId || Date.now().toString(),
        kategori: document.getElementById('kategori').value,
        nama: document.getElementById('namaSpesies').value,
        lokasi: document.getElementById('lokasi').value,
        tanggal: document.getElementById('tanggal').value,
        jumlah: document.getElementById('jumlah').value,
        habitat: document.getElementById('habitat').value,
        fotoBase64: compressedImgData || document.getElementById('previewFoto').src
    };

    let drafts = JSON.parse(localStorage.getItem('ecoDrafts')) || [];
    
    if (editId) {
        const idx = drafts.findIndex(d => d.id === editId);
        if (idx > -1) drafts[idx] = formData;
        resetFormState();
    } else {
        drafts.push(formData);
    }

    localStorage.setItem('ecoDrafts', JSON.stringify(drafts));
    document.getElementById('bioForm').reset();
    document.getElementById('previewBox').style.display = 'none';
    compressedImgData = "";
    
    showModal("Tersimpan!", "Data masuk ke Draft. Sinkronisasikan jika ada internet.");
    renderDraftUI();
});

function resetFormState() {
    document.getElementById('editId').value = "";
    document.getElementById('btnBatalEdit').style.display = 'none';
    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan ke Draft (Offline)';
    document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-clipboard-list"></i> Form Pendataan';
}
document.getElementById('btnBatalEdit').addEventListener('click', () => {
    document.getElementById('bioForm').reset();
    document.getElementById('previewBox').style.display = 'none';
    resetFormState();
});

window.editDraft = function(id) {
    let drafts = JSON.parse(localStorage.getItem('ecoDrafts')) || [];
    let d = drafts.find(x => x.id === id);
    if(!d) return;
    
    document.getElementById('editId').value = d.id;
    document.getElementById('kategori').value = d.kategori;
    document.getElementById('namaSpesies').value = d.nama;
    document.getElementById('lokasi').value = d.lokasi;
    document.getElementById('tanggal').value = d.tanggal;
    document.getElementById('jumlah').value = d.jumlah;
    document.getElementById('habitat').value = d.habitat;
    document.getElementById('previewFoto').src = d.fotoBase64;
    document.getElementById('previewBox').style.display = 'block';
    
    document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-pen-nib"></i> Mode Edit Draft';
    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-check"></i> Perbarui Draft';
    document.getElementById('btnBatalEdit').style.display = 'inline-flex';
    
    switchTab('form-tab', document.querySelectorAll('.nav-links li')[1]);
}

window.deleteDraft = function(id) {
    showConfirmModal("Konfirmasi Hapus Draft", "Yakin ingin menghapus draft ini?", () => {
        let drafts = JSON.parse(localStorage.getItem('ecoDrafts')) || [];
        localStorage.setItem('ecoDrafts', JSON.stringify(drafts.filter(d => d.id !== id)));
        renderDraftUI();
        showModal("Berhasil", "Draft berhasil dihapus dari penyimpanan lokal.");
    });
}

function renderDraftUI() {
    const drafts = JSON.parse(localStorage.getItem('ecoDrafts')) || [];
    const list = document.getElementById('draftList');
    document.getElementById('draftCount').innerText = drafts.length;

    if (drafts.length > 0) {
        document.getElementById('btnUpload').style.display = 'inline-flex';
        list.innerHTML = drafts.map(d => `
            <div class="draft-card">
                <img src="${d.fotoBase64}" alt="${d.nama}">
                <div class="draft-body">
                    <div class="draft-meta">
                        <span class="draft-badge ${d.kategori==='Flora'?'badge-flora':'badge-fauna'}">${d.kategori}</span>
                        <span class="draft-badge" style="background:#f3f4f6;">${d.jumlah} Populasi</span>
                    </div>
                    <h3>${d.nama}</h3>
                    <p><i class="fa-solid fa-location-dot"></i> ${d.lokasi}</p>
                    <div class="draft-actions">
                        <button class="btn btn-outline" onclick="editDraft('${d.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn btn-danger" onclick="deleteDraft('${d.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        document.getElementById('btnUpload').style.display = 'none';
        list.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--color-gray);"><i class="fa-solid fa-box-open" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i><br>Belum ada draft tersimpan.</div>';
    }
}
renderDraftUI();

// ==========================================
// 6. SINKRONISASI FIRESTORE
// ==========================================
document.getElementById('btnUpload').addEventListener('click', async () => {
    let drafts = JSON.parse(localStorage.getItem('ecoDrafts')) || [];
    const btn = document.getElementById('btnUpload');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim Data...';
    btn.disabled = true;

    try {
        for (let d of drafts) {
            await setDoc(doc(db, "biodiversity", d.id), {
                kategori: d.kategori, nama: d.nama, lokasi: d.lokasi,
                tanggal: d.tanggal, jumlah: Number(d.jumlah),
                habitat: d.habitat, foto_url: d.fotoBase64,
                timestamp: serverTimestamp()
            });
        }
        localStorage.removeItem('ecoDrafts'); 
        showModal("Sinkronisasi Sukses", "Semua data telah masuk ke Pusat Data EcoLens.");
        renderDraftUI();
        initGlobalData();
    } catch (error) {
        showModal("Gagal", error.message, false);
    }
    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Sinkronisasi ke Server';
    btn.disabled = false;
});

// ==========================================
// 7. INISIASI DATA PUBLIK (PETA & BERANDA)
// ==========================================
async function initGlobalData() {
    const qSnap = await getDocs(collection(db, "biodiversity"));
    let floraCount = 0, faunaCount = 0;
    
    map.eachLayer((layer) => { if (layer instanceof L.Marker) map.removeLayer(layer); });

    qSnap.forEach((doc) => {
        const d = doc.data();
        d.kategori === 'Flora' ? floraCount++ : faunaCount++;
        
        const coords = d.lokasi.split(',').map(c => parseFloat(c.trim()));
        if(coords.length === 2 && !isNaN(coords[0])) {
            const color = d.kategori === 'Flora' ? '#059669' : '#2563eb';
            const html = `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`;
            const icon = L.divIcon({ html: html, className: '' });
            L.marker([coords[0], coords[1]], {icon}).addTo(map)
                .bindPopup(`<b style="color:${color}">${d.nama}</b><br><small>${d.habitat}</small><br><img src="${d.foto_url}" style="width:100%; height:80px; object-fit:cover; border-radius:4px; margin-top:5px;">`);
        }
    });

    document.getElementById('publicFlora').innerText = floraCount;
    document.getElementById('publicFauna').innerText = faunaCount;
    
    setTimeout(() => map.invalidateSize(), 200);
}
initGlobalData();

// ==========================================
// 8. ADMIN ENGINE & ANALYTICS
// ==========================================
onAuthStateChanged(auth, (user) => {
    const navAdmin = document.getElementById('nav-admin');
    if (user) {
        navAdmin.innerHTML = '<i class="fa-solid fa-user-shield"></i> Panel Admin';
        navAdmin.style.background = '#fee2e2'; navAdmin.style.color = '#b91c1c'; navAdmin.style.border = 'none';
        if(navAdmin.classList.contains('active')) switchTab('admin-dashboard-tab');
        bootAdminEngine();
    } else {
        navAdmin.innerHTML = '<i class="fa-solid fa-lock"></i> Admin';
        navAdmin.style = '';
        if(navAdmin.classList.contains('active')) switchTab('admin-login-tab');
    }
});

document.getElementById('btnLogin').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const btnLogin = document.getElementById('btnLogin');
    
    if(!email || !pass) return showModal("Perhatian", "Email dan Password wajib diisi", false);

    btnLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...';
    btnLogin.disabled = true;

    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            btnLogin.innerHTML = 'Verifikasi & Masuk';
            btnLogin.disabled = false;
        })
        .catch(err => {
            showModal("Akses Ditolak", "Email atau Password yang Anda masukkan salah.", false);
            btnLogin.innerHTML = 'Verifikasi & Masuk';
            btnLogin.disabled = false;
        });
});

document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));

let c1, c2, masterData = [];

function bootAdminEngine() {
    onSnapshot(query(collection(db, "biodiversity"), orderBy("timestamp", "desc")), (snap) => {
        masterData = [];
        let f = 0, a = 0, b = 0, s = 0, r = 0;

        snap.forEach(docSnap => {
            const d = docSnap.data();
            d.docId = docSnap.id; 
            masterData.push(d);
            
            d.kategori === 'Flora' ? f++ : a++;
            if(d.habitat.includes("Baik")) b++; else if(d.habitat.includes("Sedang")) s++; else r++;
        });
        
        document.getElementById('adminTotFlora').innerText = f;
        document.getElementById('adminTotFauna').innerText = a;
        document.getElementById('adminTotData').innerText = snap.size;

        renderAdminTable(masterData);
        drawCharts(f, a, b, s, r);
    });
}

window.deleteServerData = async function(docId) {
    showConfirmModal("Konfirmasi", "Hapus data ini secara permanen dari server database pusat?", async () => {
        try {
            await deleteDoc(doc(db, "biodiversity", docId));
            showModal("Berhasil", "Data telah dihapus dari server pusat.");
            initGlobalData();
        } catch(err) {
            showModal("Gagal", err.message, false);
        }
    });
};

window.editServerData = function(docId) {
    let d = masterData.find(x => x.docId === docId);
    if(!d) return;

    document.getElementById('editId').value = d.docId;
    document.getElementById('kategori').value = d.kategori;
    document.getElementById('namaSpesies').value = d.nama;
    document.getElementById('lokasi').value = d.lokasi;
    document.getElementById('tanggal').value = d.tanggal;
    document.getElementById('jumlah').value = d.jumlah;
    document.getElementById('habitat').value = d.habitat;
    document.getElementById('previewFoto').src = d.foto_url;
    document.getElementById('previewBox').style.display = 'block';

    document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Data Server (Admin)';
    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-check"></i> Perbarui Data Server';
    document.getElementById('btnBatalEdit').style.display = 'inline-flex';

    switchTab('form-tab', document.querySelectorAll('.nav-links li')[1]);
};

document.getElementById('searchInput').addEventListener('input', (e) => {
    const key = e.target.value.toLowerCase();
    const filtered = masterData.filter(d => d.nama.toLowerCase().includes(key) || d.lokasi.toLowerCase().includes(key));
    renderAdminTable(filtered);
});

function renderAdminTable(dataArray) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = dataArray.map(d => `
        <tr>
            <td><span class="draft-badge ${d.kategori==='Flora'?'badge-flora':'badge-fauna'}">${d.kategori}</span></td>
            <td><strong>${d.nama}</strong></td>
            <td>${d.tanggal.replace('T', ' ')}</td>
            <td><small>${d.lokasi}</small></td>
            <td>${d.jumlah}</td>
            <td>${d.habitat}</td>
            <td><a href="${d.foto_url}" target="_blank"><img src="${d.foto_url}"></a></td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-outline" style="padding:6px 10px; font-size:0.8rem;" onclick="editServerData('${d.docId}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger" style="padding:6px 10px; font-size:0.8rem;" onclick="deleteServerData('${d.docId}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function drawCharts(flora, fauna, baik, sedang, buruk) {
    if(c1) c1.destroy(); if(c2) c2.destroy();
    
    Chart.defaults.font.family = 'Inter';
    c1 = new Chart(document.getElementById('kategoriChart'), {
        type: 'pie',
        data: { labels: ['Flora', 'Fauna'], datasets: [{ data: [flora, fauna], backgroundColor: ['#059669', '#3b82f6'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    c2 = new Chart(document.getElementById('habitatChart'), {
        type: 'bar',
        data: { labels: ['Sangat Baik', 'Sedang', 'Buruk'], datasets: [{ label: 'Jumlah Titik', data: [baik, sedang, buruk], backgroundColor: '#f59e0b', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

document.getElementById('btnExport').addEventListener('click', () => {
    if(!masterData.length) return showModal("Kosong", "Tidak ada data.", false);
    
    let csv = "Waktu_WITA,Kategori,Nama_Spesies,Lokasi_GPS,Populasi,Integritas_Habitat\n";
    masterData.forEach(r => {
        csv += `"${r.tanggal.replace('T', ' ')}","${r.kategori}","${r.nama}","${r.lokasi}",${r.jumlah},"${r.habitat}"\r\n`;
    });

    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    link.download = `EcoLens_Dataset_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
