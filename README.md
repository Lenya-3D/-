section id="gallery" class="gallery-section">
    <h2 class="section-title">Лента моих проектов</h2>
    <div id="posts-container" class="gallery-grid">
        <p style="text-align: center;">Загрузка постов...</p>
    </div>
</section>

<script>
    // Замени 'ТВОЙ_НИК' и 'ИМЯ_РЕПОЗИТОРИЯ' на свои данные из GitHub
    const GITHUB_USERNAME = 'ТВОЙ_НИК'; 
    const REPO_NAME = 'vstudio-portfolio';

    async function loadPosts() {
        const container = document.getElementById('posts-container');
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/issues`);
            const issues = await response.json();
            
            container.innerHTML = ''; // Очищаем надпись "Загрузка"

            issues.forEach(issue => {
                const card = document.createElement('div');
                card.className = 'work-card';
                
                // Ищем первую ссылку на картинку в тексте поста, если её нет - ставим заглушку
                const imgMatch = issue.body.match(/\((https?:\/\/.*\.(?:png|jpg|jpeg|gif))\)/);
                const imgSrc = imgMatch ? imgMatch[1] : 'default-image.jpg';

                card.innerHTML = `
                    <img src="${imgSrc}" alt="${issue.title}">
                    <div class="work-info">
                        <h3>${issue.title}</h3>
                        <p>${issue.body.substring(0, 100)}...</p>
                        <a href="${issue.html_url}" target="_blank" class="rec-link">Обсудить на GitHub</a>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (error) {
            container.innerHTML = '<p>Не удалось загрузить посты :(</p>';
        }
    }

    loadPosts();
</script>
