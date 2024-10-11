// 사진 업로드 API
app.post('/upload', upload.single('file'), (req, res) => {
    const tags = req.body.tags; // 쉼표로 구분된 태그를 가져옴
    console.log('Uploaded tags:', tags); // 태그 로그 추가

    if (!tags) {
        return res.status(400).json({ error: '태그는 필수입니다.' }); // 태그가 없는 경우 에러 처리
    }

    // 현재 데이터베이스에서 사진 개수 세기
    const countQuery = 'SELECT COUNT(*) AS count FROM photos';
    db.get(countQuery, [], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        const photoCount = row.count; // 현재 사진 개수
        const newFilename = `${photoCount + 1}.png`; // 새로운 파일 이름 생성
        const filepath = `/pics/${newFilename}`; // pics 폴더 내 파일 경로

        // 파일을 pics 폴더에 저장
        const filePath = path.join(UPLOADS_DIR, newFilename);
        fs.rename(req.file.path, filePath, (err) => { // multer가 임시로 저장한 파일 이름을 새로운 파일 이름으로 변경
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // 데이터베이스에 저장
            const sql = `INSERT INTO photos (filepath, tags) VALUES (?, ?)`;
            db.run(sql, [filepath, tags.join(',')], function(err) { // 태그를 배열로 변환하여 저장
                if (err) {
                    return res.status(400).json({ error: err.message });
                }
                res.json({ id: this.lastID, filepath, tags }); // 업로드 성공 시 응답
            });
        });
    });
});

// 태그에 따라 사진 가져오기 API (최신순 정렬 추가)
app.get('/photos/:tag?', (req, res) => {
    const tag = req.params.tag; // 선택된 태그 가져오기
    let sql = 'SELECT * FROM photos ORDER BY id DESC'; // 최신순으로 정렬
    const params = [];

    if (tag) {
        sql += ' WHERE tags LIKE ?'; // 태그가 있는 경우 필터링
        params.push(`%${tag}%`); // LIKE 쿼리를 위한 파라미터 설정
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows); // 사진 정보 반환
    });
});
