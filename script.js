// Import Firebase services
import { db, auth } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
// Storage imports removed as we use Base64 now

// Convert Image to Base64 String
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Upload Image (Now just returns Base64 string for Firestore)
async function uploadImageToStorage(file, itemId) {
    try {
        // Validate and compress the image first
        // Note: strict 0.5MB limit is crucial for Firestore 1MB doc limit
        const compressedFile = await validateAndCompressImage(file);

        // Convert to Base64
        const base64String = await convertImageToBase64(compressedFile);
        return base64String;
    } catch (error) {
        console.error("Error processing image:", error);
        throw error;
    }
}

// Delete Image (No-op since image is part of the document)
async function deleteImageFromStorage(imageUrl) {
    // No storage bucket to delete from
    return;
}
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const COLLECTION_NAME = 'lostAndFoundItems';

// Initial Seed Data (if Firestore is empty)
const initialItems = [
    {
        type: 'lost',
        name: 'Blue Hydro Flask',
        location: 'Library, 2nd Floor',
        date: '2025-12-16',
        description: 'Dark blue with a few stickers on it.',
        contact: '0300-1234567 (Ali)',
        image: 'https://via.placeholder.com/300/0000FF/808080?text=Hydro+Flask'
    },
    {
        type: 'found',
        name: 'Scientific Calculator',
        location: 'Lab 304',
        date: '2025-12-17',
        description: 'Casio fx-991EX found on desk 4.',
        contact: 'Turned into Dept Office',
        image: 'https://via.placeholder.com/300/000000/FFFFFF?text=Calculator'
    },
    {
        type: 'lost',
        name: 'Black Hoodie',
        location: 'Cafeteria',
        date: '2025-12-15',
        description: 'Nike hoodie, size L.',
        contact: 'sarah.student@uni.edu',
        image: 'https://via.placeholder.com/300/333333/FFFFFF?text=Hoodie'
    },
    {
        type: 'found',
        name: 'Car Keys',
        location: 'Parking Lot A',
        date: '2025-12-17',
        description: 'Toyota keys with a red keychain.',
        contact: 'Security Office (Gate 1)',
        image: 'https://via.placeholder.com/300/CCCCCC/000000?text=Keys'
    }
];

let items = [];
let currentUser = null;

// Authentication State Management
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthUI();
});

function updateAuthUI() {
    const adminStatus = document.getElementById('adminStatus');
    const adminEmailSpan = document.querySelector('#adminStatus #adminEmail');

    if (currentUser && adminStatus) {
        adminStatus.style.display = 'flex';
        if (adminEmailSpan) {
            adminEmailSpan.textContent = currentUser.email;
        }
    } else if (adminStatus) {
        adminStatus.style.display = 'none';
    }
}

// Admin Login Functions
function showAdminLogin() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('authError').style.display = 'none';
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
    }
}

async function signInAdmin(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        const modal = document.getElementById('adminLoginModal');
        if (modal) modal.style.display = 'none';
        return true;
    } catch (error) {
        const authError = document.getElementById('authError');
        if (authError) {
            authError.textContent = 'Invalid email or password. Please try again.';
            authError.style.display = 'block';
        }
        console.error('Sign in error:', error);
        return false;
    }
}

async function signOutAdmin() {
    try {
        await signOut(auth);
        alert('Signed out successfully');
    } catch (error) {
        console.error('Sign out error:', error);
        alert('Error signing out');
    }
}

// Load Items from Firestore
async function loadItemsFromFirestore() {
    try {
        const itemsCollection = collection(db, COLLECTION_NAME);
        const q = query(itemsCollection, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        items = [];
        querySnapshot.forEach((doc) => {
            items.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // If no items exist, initialize with seed data
        if (items.length === 0) {
            await initializeSeedData();
        }

        return items;
    } catch (error) {
        console.error("Error loading items from Firestore:", error);
        alert("Failed to load items. Please check your internet connection.");
        return [];
    }
}

// Initialize Firestore with seed data
async function initializeSeedData() {
    try {
        const itemsCollection = collection(db, COLLECTION_NAME);
        for (const item of initialItems) {
            await addDoc(itemsCollection, item);
        }
        console.log("Seed data initialized successfully");
        // Reload items after initialization
        await loadItemsFromFirestore();
    } catch (error) {
        console.error("Error initializing seed data:", error);
    }
}

// Validate and Compress Image before Upload
async function validateAndCompressImage(file) {
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images only.');
    }

    // File size validation (5MB max for original file)
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        throw new Error(`File size exceeds ${maxSizeMB}MB. Please choose a smaller image.`);
    }

    // Compression options
    const options = {
        maxSizeMB: 0.5, // Target compressed size: 500KB
        maxWidthOrHeight: 1920, // Max dimension: 1920px
        useWebWorker: true,
        fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg', // Preserve PNG transparency
        initialQuality: 0.8 // Good quality with compression
    };

    try {
        console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        const compressedFile = await imageCompression(file, options);
        console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Compression ratio: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`);
        return compressedFile;
    } catch (error) {
        console.error('Compression error:', error);
        throw new Error('Failed to compress image. Please try a different image.');
    }
}

// (Old storage functions removed)

// Populate Gallery
const galleryGrid = document.querySelector('.gallery-grid');

async function renderGallery() {
    if (!galleryGrid) return;

    galleryGrid.innerHTML = '<p style="text-align: center; color: #666;">Loading items...</p>';

    await loadItemsFromFirestore();

    galleryGrid.innerHTML = ''; // Clear loading message

    if (items.length === 0) {
        galleryGrid.innerHTML = '<p style="text-align: center; color: #666;">No items found.</p>';
        return;
    }

    items.forEach((item) => {
        const card = document.createElement('div');
        card.classList.add('item-card');

        card.innerHTML = `
            <div class="item-content">
                <span class="item-badge ${item.type}">${item.type.toUpperCase()}</span>
                <h3 class="item-title">${item.name}</h3>
                <div class="item-details">
                    <p><i class="fas fa-map-marker-alt"></i> ${item.location}</p>
                    <p><i class="far fa-calendar-alt"></i> ${item.date}</p>
                </div>
                <p>${item.description}</p>
            </div>
        `;
        galleryGrid.appendChild(card);

        // Modal Event Listener
        card.addEventListener('click', () => openModal(item));
    });
}

// Setup real-time listener for gallery updates
function setupRealtimeListener() {
    if (!galleryGrid) return;

    const itemsCollection = collection(db, COLLECTION_NAME);
    const q = query(itemsCollection, orderBy('date', 'desc'));

    onSnapshot(q, (snapshot) => {
        items = [];
        snapshot.forEach((doc) => {
            items.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Re-render gallery
        galleryGrid.innerHTML = '';

        if (items.length === 0) {
            galleryGrid.innerHTML = '<p style="text-align: center; color: #666;">No items found.</p>';
            return;
        }

        items.forEach((item) => {
            const card = document.createElement('div');
            card.classList.add('item-card');

            card.innerHTML = `
                <div class="item-content">
                    <span class="item-badge ${item.type}">${item.type.toUpperCase()}</span>
                    <h3 class="item-title">${item.name}</h3>
                    <div class="item-details">
                        <p><i class="fas fa-map-marker-alt"></i> ${item.location}</p>
                        <p><i class="far fa-calendar-alt"></i> ${item.date}</p>
                    </div>
                    <p>${item.description}</p>
                </div>
            `;
            galleryGrid.appendChild(card);
            card.addEventListener('click', () => openModal(item));
        });
    });
}

// Initial Render
if (galleryGrid) {
    renderGallery();
    setupRealtimeListener();
}

// Identify Page Type for Form Submission
const isLostPage = window.location.pathname.includes('report-lost.html');
const isFoundPage = window.location.pathname.includes('report-found.html');
const reportForm = document.querySelector('form');

if (reportForm) {
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitButton = reportForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        try {
            const type = isLostPage ? 'lost' : 'found';
            const name = document.getElementById('itemName').value;
            const location = document.getElementById('location').value;
            const date = document.getElementById('date').value;
            const description = document.getElementById('description').value;
            const contact = document.getElementById('contact').value;

            let finalContact = contact;
            if (isFoundPage) {
                const turnedIn = document.getElementById('turnedIn').value;
                if (turnedIn) {
                    const map = {
                        'security': 'Security Office',
                        'admin': 'Admin Office',
                        'library': 'Library Front Desk'
                    };
                    finalContact = `${map[turnedIn] || turnedIn} (Reported by: ${contact})`;
                }
            }

            // Handle Image
            const imageInput = document.getElementById('image');
            let image = `https://via.placeholder.com/300?text=${encodeURIComponent(name)}`;

            // Generate a temporary ID for the item
            const tempId = Date.now().toString(36) + Math.random().toString(36).substr(2);

            if (imageInput.files && imageInput.files[0]) {
                try {
                    submitButton.textContent = 'Encoding image...';
                    image = await uploadImageToStorage(imageInput.files[0], tempId);
                } catch (err) {
                    console.error("Error uploading image:", err);
                    // Show specific error message to user
                    alert(err.message || "Failed to upload image. Using default placeholder.");
                    // Reset button state and stop submission if it's a validation error
                    if (err.message && (err.message.includes('Invalid file type') || err.message.includes('exceeds'))) {
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                        return; // Stop form submission
                    }
                }
            }

            const newItem = {
                type,
                name,
                location,
                date,
                description,
                contact: finalContact,
                image
            };

            submitButton.textContent = 'Saving to database...';
            const itemsCollection = collection(db, COLLECTION_NAME);
            await addDoc(itemsCollection, newItem);

            alert('Report Submitted Successfully!');
            reportForm.reset();
            window.location.href = 'gallery.html';
        } catch (error) {
            console.error("Error submitting report:", error);
            alert("Failed to submit report. Please try again.");
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}

// Delete Item Function (Admin Protected with Firebase Auth)
window.deleteItem = async function (id, imageUrl) {
    // Check if user is authenticated
    if (!currentUser) {
        showAdminLogin();
        // Store the delete action to execute after login
        window.pendingDelete = { id, imageUrl };
        return;
    }

    try {
        // Delete image from storage if it exists
        if (imageUrl) {
            await deleteImageFromStorage(imageUrl);
        }

        // Delete document from Firestore
        await deleteDoc(doc(db, COLLECTION_NAME, id));

        const modal = document.getElementById('itemModal');
        if (modal) modal.style.display = 'none';

        alert('Item marked as resolved and removed.');
    } catch (error) {
        console.error("Error deleting item:", error);
        if (error.code === 'permission-denied') {
            alert("Permission denied. Please make sure you're signed in as an admin.");
        } else {
            alert("Failed to delete item. Please try again.");
        }
    }
};

// Modal Logic
const modal = document.getElementById('itemModal');
const closeBtn = document.querySelector('.close-btn');
const modalDetails = document.getElementById('modalDetails');

function openModal(item) {
    if (!modal || !modalDetails) return;

    const deleteButtonHtml = `<button onclick="deleteItem('${item.id}', '${item.image}')" class="btn" style="width: 100%; border: none; cursor: pointer; background-color: #e74c3c; color: white; margin-top: 10px; padding: 10px; border-radius: 5px; font-weight: bold;">Mark as Resolved (Admin Only)</button>`;

    modalDetails.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="${item.image}" alt="${item.name}" style="max-width: 100%; border-radius: 10px; max-height: 300px; object-fit: contain;">
        </div>
        <span class="item-badge ${item.type}">${item.type.toUpperCase()}</span>
        <h2 style="margin: 15px 0; color: #333;">${item.name}</h2>
        <div style="margin-bottom: 20px; line-height: 1.8; color: #555;">
            <p><strong><i class="fas fa-map-marker-alt"></i> Location:</strong> ${item.location}</p>
            <p><strong><i class="far fa-calendar-alt"></i> Date:</strong> ${item.date}</p>
            <p><strong><i class="fas fa-user-circle"></i> Contact:</strong> ${item.contact}</p>
            <p><strong><i class="fas fa-info-circle"></i> Description:</strong><br>${item.description}</p>
        </div>
        <button onclick="document.getElementById('itemModal').style.display='none'" class="btn btn-found" style="width: 100%; border: none; cursor: pointer; padding: 10px; border-radius: 5px;">Close Details</button>
        ${deleteButtonHtml}
    `;
    modal.style.display = 'block';
}

if (modal && closeBtn) {
    closeBtn.onclick = function () {
        modal.style.display = "none";
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

// Admin Login Modal Event Listeners
const adminLoginModal = document.getElementById('adminLoginModal');
const closeAdminBtn = document.querySelector('.close-admin-btn');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');

if (closeAdminBtn) {
    closeAdminBtn.onclick = function () {
        if (adminLoginModal) adminLoginModal.style.display = 'none';
    }
}

if (signInBtn) {
    signInBtn.onclick = async function () {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;

        if (!email || !password) {
            const authError = document.getElementById('authError');
            if (authError) {
                authError.textContent = 'Please enter both email and password.';
                authError.style.display = 'block';
            }
            return;
        }

        signInBtn.disabled = true;
        signInBtn.textContent = 'Signing in...';

        const success = await signInAdmin(email, password);

        signInBtn.disabled = false;
        signInBtn.textContent = 'Sign In';

        // If there's a pending delete action, execute it
        if (success && window.pendingDelete) {
            const { id, imageUrl } = window.pendingDelete;
            window.pendingDelete = null;
            await window.deleteItem(id, imageUrl);
        }
    }
}

if (signOutBtn) {
    signOutBtn.onclick = signOutAdmin;
}

// Close admin login modal when clicking outside
window.addEventListener('click', function (event) {
    if (event.target == adminLoginModal) {
        adminLoginModal.style.display = 'none';
    }
});
