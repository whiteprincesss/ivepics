// scripts.js

const photoContainer = document.getElementById('photoContainer');
const tagFilter = document.getElementById('tagFilter');
const errorMessage = document.getElementById('errorMessage');
const downloadLink = document.getElementById('downloadLink');

const fetchPhotos = (tag) => {
    fetch(tag ? `/photos/${tag}` : '/photos')
        .then(response => {
            if (!response.ok) throw new Error('사진을 가져오는 중 오류가 발생했습니다.');
            return response.json();
        })
        .then(data => {
            errorMessage.textContent = '';
            photoContainer.innerHTML = '';
            data.reverse().forEach(photo => {
                const img = document.createElement('img');
                img.src = photo.filepath;
                img.alt = photo.tags;
                img.onclick = () => showModal(photo.filepath);
                photoContainer.appendChild(img);
            });
        })
        .catch(error => {
            console.error('Error fetching photos:', error);
            errorMessage.textContent = error.message;
        });
};

const showModal = (src) => {
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = src;
    downloadLink.href = src;
    modal.style.display = 'block';
};

const closeModal = () => {
    document.getElementById('modal').style.display = 'none';
};

tagFilter.addEventListener('change', (e) => fetchPhotos(e.target.value));

document.getElementById('uploadButton').addEventListener('click', () => {
    window.location.href = '/upload';
});

document.getElementById('closeModal').addEventListener('click', closeModal);

// 초기 사진 가져오기
fetchPhotos();

// 업로드 페이지 스크립트
document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // 선택된 태그를 가져오기 
    const tags = Array.from(this.querySelectorAll('input[name="tags"]:checked')).map(checkbox => checkbox.value);
    
    // 태그가 선택되었는지 확인
    if (tags.length === 0) {
        alert('태그를 선택해주세요.'); // 선택하지 않았을 경우 경고
        return; // 폼 제출 중단
    }

    const formData = new FormData(this);
    formData.append('tags', tags); // 선택된 태그를 배열 형태로 추가
    
    console.log('Selected tags:', tags); // 선택된 태그 로그 추가

    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('서버에서 오류가 발생했습니다. 다시 시도해주세요.');
        }
        return response.json();
    })
    // 업로드 후 홈으로 돌아가기
    .then(data => {
        alert('사진이 업로드되었습니다');
        window.location.href = '/'; // 업로드 후 홈으로 돌아가기
    })
    .catch(error => {
        console.error('Error:', error);
        alert('사진 업로드 실패: ' + error.message);
    });
});
