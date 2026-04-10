const postForm = document.getElementById("postForm");
const postAuthor = document.getElementById("postAuthor");
const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const postVideo = document.getElementById("postVideo");
const postLink = document.getElementById("postLink");
const postsList = document.getElementById("postsList");
const profileForm = document.getElementById("profileForm");
const profileName = document.getElementById("profileName");
const profileBio = document.getElementById("profileBio");
const profileAvatar = document.getElementById("profileAvatar");
const activeProfile = document.getElementById("activeProfile");
const profilesList = document.getElementById("profilesList");
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
let posts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let profiles = JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY)) || [];
let currentProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY) || "";

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

postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const currentProfile = getCurrentProfile();
    const author = currentProfile ? currentProfile.name : postAuthor.value.trim();
    const text = postText.value.trim();
    const imageFile = postImage.files[0];
    const videoFile = postVideo.files[0];
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

    const newPost = {
        author,
        authorProfileId: currentProfile ? currentProfile.id : "",
        text,
        image,
        video,
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

activeProfile.addEventListener("change", () => {
    currentProfileId = activeProfile.value;
    saveCurrentProfile();
    const currentProfile = getCurrentProfile();
    postAuthor.value = currentProfile ? currentProfile.name : "";
});

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

renderProfiles();
renderPosts();
