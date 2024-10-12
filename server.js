const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

// 폴더 경로 상수
const UPLOADS_DIR = path.join(__dirname, "pics");
const PUBLIC_DIR = path.join(__dirname, "public");

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR); // 파일을 저장할 폴더를 'pics'로 설정
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // 파일명에 시간 추가
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 파일 크기 제한 (5MB)
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/; // 허용할 이미지 파일 확장자
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드할 수 있습니다.')); // 잘못된 파일 형식 처리
    }
  },
});

// Middleware 설정
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR)); // 정적 파일을 제공할 폴더
app.use("/pics", express.static(UPLOADS_DIR)); // pics 폴더의 정적 파일 제공

// pics 폴더 생성
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// 데이터베이스 연결
const db = new sqlite3.Database("./ivepics.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the SQLite database.");

  // 테이블 생성
  db.run(
    `CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filepath TEXT NOT NULL,
        tags TEXT
    )`,
    (err) => {
      if (err) {
        console.error(err.message);
      }
      console.log("Photos table created or already exists.");
    }
  );
});

// 기본 라우트 추가
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// 업로드 페이지 제공
app.get("/upload", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "upload.html")); // 업로드 HTML 파일 경로
});

// 사진 업로드 API
app.post("/upload", upload.single("file"), (req, res) => {
  const tags = req.body.tags; // 쉼표로 구분된 태그를 가져옴
  console.log("Uploaded tags:", tags); // 태그 로그 추가

  if (!tags) {
    return res.status(400).json({ error: "태그는 필수입니다." }); // 태그가 없는 경우 에러 처리
  }

  // 현재 데이터베이스에서 사진 개수 세기
  const countQuery = "SELECT COUNT(*) AS count FROM photos";
  db.get(countQuery, [], (err, row) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const photoCount = row.count; // 현재 사진 개수
    const newFilename = `${photoCount + 1}.png`; // 새로운 파일 이름 생성
    const filepath = `/pics/${newFilename}`; // pics 폴더 내 파일 경로

    // 파일을 pics 폴더에 저장
    const filePath = path.join(UPLOADS_DIR, newFilename);
    fs.rename(req.file.path, filePath, (err) => {
      // multer가 임시로 저장한 파일 이름을 새로운 파일 이름으로 변경
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 데이터베이스에 저장
      const sql = `INSERT INTO photos (filepath, tags) VALUES (?, ?)`;
      db.run(sql, [filepath, tags.join(",")], function (err) {
        // 태그를 배열로 변환하여 저장
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        res.json({ id: this.lastID, filepath, tags });
      });
    });
  });
});

// 태그에 따라 사진 가져오기 API
app.get("/photos/:tag?", (req, res) => {
  const tag = req.params.tag; // 선택된 태그 가져오기
  let sql = "SELECT * FROM photos";
  const params = [];

  if (tag) {
    sql += " WHERE tags LIKE ?"; // 태그가 있는 경우 필터링
    params.push(`%${tag}%`); // LIKE 쿼리를 위한 파라미터 설정
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(rows); // 사진 정보 반환
  });
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});
