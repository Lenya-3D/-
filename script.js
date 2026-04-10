const postForm = document.getElementById("postForm");
const postAuthor = document.getElementById("postAuthor");
const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const postVideo = document.getElementById("postVideo");
const postAudio = document.getElementById("postAudio");
const postLink = document.getElementById("postLink");
const postsList = document.getElementById("postsList");
const profileForm = document.getElementById("profileForm");
const profileName = document.getElementById("profileName");
const profileBio = document.getElementById("profileBio");
const profileAvatar = document.getElementById("profileAvatar");
const activeProfile = document.getElementById("activeProfile");
const profilesList = document.getElementById("profilesList");
const desktopGallery = document.getElementById("desktopGallery");
const customDesktopImage = document.getElementById("customDesktopImage");
const applyDesktopImage = document.getElementById("applyDesktopImage");
const siteTabs = document.getElementById("siteTabs");
const startAudioRecord = document.getElementById("startAudioRecord");
const stopAudioRecord = document.getElementById("stopAudioRecord");
const REACTIONS = [
    { key: "heart", emoji: "❤️" },
    { key: "laugh", emoji: "😂" },
    { key: "wow", emoji: "😮" },
    { key: "sad", emoji: "😢" },
    { key: "fire", emoji: "🔥" }
];

const STORAGE_KEY = "community_posts";
const PROFILES_STORAGE_KEY = "community_profiles";
const ACTIVE_PROFILE_STORAGE_KEY = "community_active_profile";
const DESKTOP_BG_STORAGE_KEY = "community_desktop_background";
const ACTIVE_TAB_STORAGE_KEY = "community_active_tab";
let posts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let profiles = JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY)) || [];
let currentProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY) || "";
let currentDesktopBackground = loadDesktopBackground();
let currentTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || "desktop";
let recordedAudioDataUrl = "";
let audioRecorder = null;
let audioRecordChunks = [];
let activeAudioStream = null;

function savePosts() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch (error) {
        alert("Не удалось сохранить посты: хранилище переполнено. Удалите старые посты с большими файлами.");
    }
}

function saveProfiles() {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

function saveCurrentProfile() {
    localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, currentProfileId);
}

function getCurrentProfile() {
    return profiles.find((profile) => profile.id === currentProfileId) || null;
}

function getAvatarByPost(post) {
    if (post.authorProfileId) {
        const authorProfile = profiles.find((profile) => profile.id === post.authorProfileId);
        if (authorProfile && authorProfile.avatar) return authorProfile.avatar;
    }
    const byName = profiles.find((profile) => profile.name === post.author);
    return byName && byName.avatar ? byName.avatar : "";
}

function renderProfiles() {
    activeProfile.innerHTML = '<option value="">Без профиля</option>';
    profilesList.innerHTML = "";

    profiles.forEach((profile) => {
        const option = document.createElement("option");
        option.value = profile.id;
        option.textContent = profile.name;
        if (profile.id === currentProfileId) option.selected = true;
        activeProfile.appendChild(option);

        const profileCard = document.createElement("article");
        profileCard.className = "profile-item";
        const profileAvatarHtml = profile.avatar
            ? `<img src="${profile.avatar}" alt="Иконка профиля ${profile.name}" class="profile-avatar">`
            : `<div class="profile-avatar profile-avatar-placeholder" aria-hidden="true"></div>`;
        profileCard.innerHTML = `
            ${profileAvatarHtml}
            <h3>${profile.name}</h3>
            <p>${profile.bio || "Без описания"}</p>
            <button type="button" class="delete-profile" data-profile-id="${profile.id}">Удалить профиль</button>
        `;
        profilesList.appendChild(profileCard);
    });

    const currentProfile = getCurrentProfile();
    if (currentProfile) {
        postAuthor.value = currentProfile.name;
    }
}

function renderPosts() {
    postsList.innerHTML = "";

    if (posts.length === 0) {
        postsList.innerHTML = "<p>Пока постов нет. Напишите первый!</p>";
        return;
    }

    posts.forEach((post, index) => {
        const postItem = document.createElement("article");
        postItem.className = "post-item";
        const safeReactions = post.reactions || {};
        const reactionsHtml = REACTIONS.map((reaction) => {
            const count = Number(safeReactions[reaction.key]) || 0;
            return `<button data-index="${index}" data-reaction="${reaction.key}" class="reaction-post">${reaction.emoji} ${count}</button>`;
        }).join(" ");
        const postImageHtml = post.image
            ? `<br><img src="${post.image}" alt="Фото поста" class="post-image">`
            : "";
        const postVideoHtml = post.video
            ? `<br><video src="${post.video}" class="post-video" controls preload="metadata"></video>`
            : "";
        const postAudioHtml = post.audio
            ? `<br><audio src="${post.audio}" class="post-audio" controls preload="metadata"></audio>`
            : "";
        const postLinkHtml = post.link
            ? `<p><a href="${post.link}" class="post-link" target="_blank" rel="noopener noreferrer">${post.link}</a></p>`
            : "";
        const postAvatar = getAvatarByPost(post);
        const postAvatarHtml = postAvatar
            ? `<img src="${postAvatar}" alt="Иконка автора ${post.author}" class="post-author-avatar">`
            : `<div class="post-author-avatar post-author-avatar-placeholder" aria-hidden="true"></div>`;
        postItem.innerHTML = `
            <div class="post-author-row">
                ${postAvatarHtml}
                <h3>${post.author}</h3>
            </div>
            <p>${post.text}</p>
            ${postImageHtml}
            ${postVideoHtml}
            ${postAudioHtml}
            ${postLinkHtml}
            <small>${post.date}</small><br>
            ${reactionsHtml}<br>
            <button data-index="${index}" class="delete-post">Удалить</button>
            <hr>
        `;
        postsList.appendChild(postItem);
    });
}

function readImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Ошибка чтения файла"));
        reader.readAsDataURL(file);
    });
}

function normalizePostLink(rawValue) {
    const value = rawValue.trim();
    if (!value) return "";
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
        const parsed = new URL(withProtocol);
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
        return parsed.href;
    } catch (error) {
        return null;
    }
}

function loadDesktopBackground() {
    const defaultValue = { type: "preset", value: "linear-gradient(135deg, #f4f6fb, #dbeafe)" };
    const storedValue = localStorage.getItem(DESKTOP_BG_STORAGE_KEY);
    if (!storedValue) return defaultValue;
    try {
        const parsedValue = JSON.parse(storedValue);
        if (parsedValue && typeof parsedValue.type === "string" && typeof parsedValue.value === "string") {
            return parsedValue;
        }
        return defaultValue;
    } catch (error) {
        return { type: "preset", value: storedValue };
    }
}

function saveDesktopBackground(backgroundConfig) {
    try {
        localStorage.setItem(DESKTOP_BG_STORAGE_KEY, JSON.stringify(backgroundConfig));
        return true;
    } catch (error) {
        alert("Не удалось сохранить фон: картинка слишком большая.");
        return false;
    }
}

function applyDesktopBackground(backgroundConfig) {
    if (backgroundConfig.type === "image") {
        document.body.style.backgroundImage = `url("${backgroundConfig.value}")`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center center";
        document.body.style.backgroundRepeat = "no-repeat";
    } else {
        document.body.style.backgroundImage = backgroundConfig.value;
        document.body.style.backgroundSize = "auto";
        document.body.style.backgroundPosition = "center center";
        document.body.style.backgroundRepeat = "repeat";
    }
    currentDesktopBackground = backgroundConfig;
    if (!saveDesktopBackground(backgroundConfig)) return;
    if (!desktopGallery) return;
    const thumbs = desktopGallery.querySelectorAll(".desktop-thumb");
    thumbs.forEach((thumb) => {
        const isActive = backgroundConfig.type === "preset" && thumb.dataset.bg === backgroundConfig.value;
        thumb.classList.toggle("active", isActive);
    });
}

function showTab(tabId) {
    const allSections = document.querySelectorAll(".tab-content");
    allSections.forEach((section) => {
        section.classList.toggle("hidden", section.id !== tabId);
    });
    if (siteTabs) {
        const tabs = siteTabs.querySelectorAll(".site-tab");
        tabs.forEach((tabButton) => {
            const isActive = tabButton.dataset.tabTarget === tabId;
            tabButton.classList.toggle("active", isActive);
        });
    }
    currentTab = tabId;
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabId);
}

postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const currentProfile = getCurrentProfile();
    const author = currentProfile ? currentProfile.name : postAuthor.value.trim();
    const text = postText.value.trim();
    const imageFile = postImage.files[0];
    const videoFile = postVideo.files[0];
    const audioFile = postAudio.files[0];
    const link = normalizePostLink(postLink.value);

    if (!author || !text) return;
    if (link === null) {
        alert("Ссылка введена неверно. Пример: https://vk.com/your_group");
        return;
    }

    let image = "";
    if (imageFile) {
        if (!imageFile.type.startsWith("image/")) {
            alert("Можно загружать только изображения.");
            return;
        }
        image = await readImageAsDataUrl(imageFile);
    }

    let video = "";
    if (videoFile) {
        if (!videoFile.type.startsWith("video/")) {
            alert("Можно загружать только видео.");
            return;
        }
        video = URL.createObjectURL(videoFile);
    }

    let audio = "";
    if (audioFile) {
        if (!audioFile.type.startsWith("audio/")) {
            alert("Можно загружать только аудио.");
            return;
        }
        audio = await readImageAsDataUrl(audioFile);
    } else if (recordedAudioDataUrl) {
        audio = recordedAudioDataUrl;
    }

    const newPost = {
        author,
        authorProfileId: currentProfile ? currentProfile.id : "",
        text,
        image,
        video,
        audio,
        link,
        date: new Date().toLocaleString("ru-RU"),
        reactions: {
            heart: 0,
            laugh: 0,
            wow: 0,
            sad: 0,
            fire: 0
        }
    };

    posts.unshift(newPost);
    savePosts();
    renderPosts();
    postForm.reset();
    recordedAudioDataUrl = "";
    if (currentProfile) postAuthor.value = currentProfile.name;
});

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = profileName.value.trim();
    const bio = profileBio.value.trim();
    const avatarFile = profileAvatar.files[0];

    if (!name) return;

    let avatar = "";
    if (avatarFile) {
        if (!avatarFile.type.startsWith("image/")) {
            alert("Иконка профиля должна быть изображением.");
            return;
        }
        avatar = await readImageAsDataUrl(avatarFile);
    }

    const newProfile = {
        id: crypto.randomUUID(),
        name,
        bio,
        avatar
    };

    profiles.push(newProfile);
    currentProfileId = newProfile.id;
    saveProfiles();
    saveCurrentProfile();
    renderProfiles();
    profileForm.reset();
});

profilesList.addEventListener("click", (event) => {
    if (!event.target.classList.contains("delete-profile")) return;
    const profileId = event.target.dataset.profileId;
    if (!profileId) return;
    const profileToDelete = profiles.find((profile) => profile.id === profileId);
    if (!profileToDelete) return;
    const isConfirmed = window.confirm(`Удалить профиль "${profileToDelete.name}"?`);
    if (!isConfirmed) return;

    profiles = profiles.filter((profile) => profile.id !== profileId);
    posts = posts.map((post) => {
        if (post.authorProfileId !== profileId) return post;
        return {
            ...post,
            author: "Удаленный профиль",
            authorProfileId: ""
        };
    });

    if (currentProfileId === profileId) {
        currentProfileId = "";
        postAuthor.value = "";
        saveCurrentProfile();
    }

    saveProfiles();
    savePosts();
    renderProfiles();
    renderPosts();
});

activeProfile.addEventListener("change", () => {
    currentProfileId = activeProfile.value;
    saveCurrentProfile();
    const currentProfile = getCurrentProfile();
    postAuthor.value = currentProfile ? currentProfile.name : "";
});

if (desktopGallery) {
    desktopGallery.addEventListener("click", (event) => {
        if (!event.target.classList.contains("desktop-thumb")) return;
        const backgroundValue = event.target.dataset.bg;
        if (!backgroundValue) return;
        applyDesktopBackground({ type: "preset", value: backgroundValue });
    });
}

if (applyDesktopImage) {
    applyDesktopImage.addEventListener("click", async () => {
        const imageFile = customDesktopImage && customDesktopImage.files ? customDesktopImage.files[0] : null;
        if (!imageFile) {
            alert("Сначала выберите картинку для фона.");
            return;
        }
        if (!imageFile.type.startsWith("image/")) {
            alert("Для фона можно выбрать только изображение.");
            return;
        }
        const imageDataUrl = await readImageAsDataUrl(imageFile);
        applyDesktopBackground({ type: "image", value: imageDataUrl });
    });
}

if (siteTabs) {
    siteTabs.addEventListener("click", (event) => {
        if (!event.target.classList.contains("site-tab")) return;
        const tabId = event.target.dataset.tabTarget;
        if (!tabId) return;
        showTab(tabId);
    });
}

if (startAudioRecord && stopAudioRecord) {
    startAudioRecord.addEventListener("click", async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Запись аудио не поддерживается в этом браузере.");
            return;
        }
        try {
            activeAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioRecorder = new MediaRecorder(activeAudioStream);
            audioRecordChunks = [];
            recordedAudioDataUrl = "";

            audioRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioRecordChunks.push(event.data);
                }
            };

            audioRecorder.onstop = async () => {
                const audioBlob = new Blob(audioRecordChunks, { type: "audio/webm" });
                if (audioBlob.size > 0) {
                    const audioFile = new File([audioBlob], "recorded-audio.webm", { type: "audio/webm" });
                    recordedAudioDataUrl = await readImageAsDataUrl(audioFile);
                }
                if (activeAudioStream) {
                    activeAudioStream.getTracks().forEach((track) => track.stop());
                    activeAudioStream = null;
                }
                startAudioRecord.disabled = false;
                stopAudioRecord.disabled = true;
                alert("Запись аудио готова. Теперь можно публиковать пост.");
            };

            audioRecorder.start();
            startAudioRecord.disabled = true;
            stopAudioRecord.disabled = false;
        } catch (error) {
            alert("Не удалось начать запись аудио. Проверьте доступ к микрофону.");
        }
    });

    stopAudioRecord.addEventListener("click", () => {
        if (!audioRecorder || audioRecorder.state !== "recording") return;
        audioRecorder.stop();
    });
}

postsList.addEventListener("click", (event) => {
    if (event.target.classList.contains("reaction-post")) {
        const index = Number(event.target.dataset.index);
        const reactionKey = event.target.dataset.reaction;
        if (!posts[index].reactions) {
            posts[index].reactions = {
                heart: 0,
                laugh: 0,
                wow: 0,
                sad: 0,
                fire: 0
            };
        }
        posts[index].reactions[reactionKey] = (Number(posts[index].reactions[reactionKey]) || 0) + 1;
        savePosts();
        renderPosts();
        return;
    }

    if (!event.target.classList.contains("delete-post")) return;

    const index = Number(event.target.dataset.index);
    if (posts[index] && typeof posts[index].video === "string" && posts[index].video.startsWith("blob:")) {
        URL.revokeObjectURL(posts[index].video);
    }
    posts.splice(index, 1);
    savePosts();
    renderPosts();
});

posts = posts.map((post) => {
    if (post.reactions) return post;

    return {
        ...post,
        reactions: {
            heart: Number(post.likes) || 0,
            laugh: 0,
            wow: 0,
            sad: 0,
            fire: 0
        }
    };
});
if (currentProfileId && !getCurrentProfile()) {
    currentProfileId = "";
    saveCurrentProfile();
}
savePosts();
applyDesktopBackground(currentDesktopBackground);
showTab(currentTab);

renderProfiles();
renderPosts();
