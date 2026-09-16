const express = require('express');
const cors = require('cors');
const mysql = require('mysql2'); 


const passport = require('passport');
const YandexStrategy = require('passport-yandex').Strategy;


const app = express();
const PORT = 3000;

app.use(cors());

app.use(express.json());


const os = require('os');

// Если операционная система НЕ Windows (то есть Linux на Render) — включаем интернет-базу
const isProduction = os.platform() !== 'win32';

const connection = mysql.createConnection({
  host: 'x92017w9.beget.tech',
  user: 'x92017w9',        
  password: '228355480DenutUtkin$',        
  database: 'x92017w9_prosmot' 
});


passport.use(new YandexStrategy({
    clientID: '2a61cab306f94bc69b9e6be07bc31ff1',
    clientSecret: '9b6c6a7aa78e493780a13ef30197c99c',
    callbackURL: "http://localhost:3000/auth/yandex/callback",
    state: false // ВОТ ЭТА СТРОКА КРИТИЧЕСКИ ВАЖНА ДЛЯ РАБОТЫ БЕЗ СЕССИЙ!
  },
  function(accessToken, refreshToken, profile, done) {
    const yandexId = profile.id;
    const name = profile.displayName || profile.username;
    const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
    const avatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

    const checkSql = "SELECT * FROM users WHERE yandex_id = ?";
    connection.query(checkSql, [yandexId], (err, results) => {
        if (err) return done(err);

        if (results.length > 0) {
            return done(null, results[0]); 
        } else {
            const insertSql = "INSERT INTO users (login, email, avatar_url, yandex_id) VALUES (?, ?, ?, ?)";
            connection.query(insertSql, [name, email, avatar, yandexId], (err, result) => {
                if (err) return done(err);
                const newUser = { id: result.insertId, login: name, avatar_url: avatar };
                return done(null, newUser);
            });
        }
    });
  }
));


app.use(passport.initialize());






app.get('/api/v1/movies', (req, res) => {
    const sqlQuery = "SELECT * FROM movies ORDER BY mesto ASC";
    connection.query(sqlQuery, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/v1/featured-movies', (req, res) => {
    const sqlQuery = "SELECT * FROM movies ORDER BY mesto ASC LIMIT 6";
    connection.query(sqlQuery, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/v1/carts_smptr', (req, res) => {
    const sqlQuery = "SELECT * FROM carts_smptr";
    connection.query(sqlQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results); 
    });
});

app.get('/api/v1/random_films', (req, res) => {
    const sqlQuery = "SELECT * FROM random_films";
    connection.query(sqlQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results); 
    });
});

app.get('/api/v1/Kalendar_films', (req, res) => {
    const sqlQuery = `
        SELECT 
            f.id AS movie_id, f.badge, f.image_url, f.title, f.premiere_date, f.duration, f.genre, f.director,
            a.name AS actor_name, a.photo_url, link.role_name
        FROM Kalendar_films f
        LEFT JOIN Kalendar_acter_film link ON f.id = link.movie_id
        LEFT JOIN actors a ON link.actor_id = a.id
    `;

    connection.query(sqlQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const moviesMap = {};

        results.forEach(row => {
            if (!moviesMap[row.movie_id]) {
                moviesMap[row.movie_id] = {
                    id: row.movie_id,
                    badge: row.badge,
                    image_url: row.image_url,
                    title: row.title,
                    premiere_date: row.premiere_date,
                    duration: row.duration,
                    genre: row.genre,
                    director: row.director,
                    actors: [] 
                };
            }

            if (row.actor_name) {
                moviesMap[row.movie_id].actors.push({
                    name: row.actor_name,
                    photo_url: row.photo_url,
                    role_name: row.role_name
                });
            }
        });

        res.json(Object.values(moviesMap)); 
    });
});

app.get('/api/v1/smotr_slider', (req, res) => {
    const sqlQuery = `
        SELECT 
            sm.id AS movie_id, sm.image_url, sm.title, sm.duration, sm.genre, sm.country, sm.director,
            a.name AS actor_name, a.photo_url, link.role_name
        FROM smotr_slider sm
        LEFT JOIN smotr_slider_film_actor link ON sm.id = link.movie_id
        LEFT JOIN actors a ON link.actor_id = a.id
    `;

    connection.query(sqlQuery, (err, results) => {
        if (err) {
            console.error('КРИТИЧЕСКАЯ ОШИБКА SQL В СЛАЙДЕРЕ:', err.message);
            return res.status(500).json({ error: err.message });
        }

        const sliderMap = {};

        results.forEach(row => {
            if (!sliderMap[row.movie_id]) {
                sliderMap[row.movie_id] = {
                    id: row.movie_id,
                    image_url: row.image_url,
                    title: row.title,
                    duration: row.duration,
                    genre: row.genre,
                    country: row.country,
                    director: row.director,
                    actors: [] 
                };
            }

            if (row.actor_name) {
                sliderMap[row.movie_id].actors.push({
                    name: row.actor_name,
                    photo_url: row.photo_url,
                    role_name: row.role_name
                });
            }
        });

        res.json(Object.values(sliderMap)); 
    });
});





app.post('/api/v1/register', (req, res) => {
    const { login, email, password } = req.body; 
    const sqlQuery = "INSERT INTO users (login, email, password) VALUES (?, ?, ?)";
    connection.query(sqlQuery, [login, email, password], (err, result) => {
        if (err) {
            console.error('Ошибка регистрации:', err.message);
            return res.status(500).json({ success: false, message: 'Логин или email уже заняты!' });
        }
        res.json({ success: true });
    });
});



app.post('/api/v1/login', (req, res) => {
    const { login, password } = req.body;
    const sqlQuery = "SELECT id, login, email, avatar_url FROM users WHERE login = ? AND password = ?";
    connection.query(sqlQuery, [login, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.json({ success: false, message: 'Неверный логин или пароль!' });
        }
    });
});


app.get('/auth/yandex', passport.authenticate('yandex'));

app.get('/auth/yandex/callback', 
  passport.authenticate('yandex', { session: false, failureRedirect: 'http://127.0.0.1' }),
  function(req, res) {
    console.log(`первое норм`);
    

    const login = req.user.login; 
    const avatar = req.user.avatar_url;

    const loginEncoded = encodeURIComponent(login);
    const avatarEncoded = encodeURIComponent(avatar);
    
    console.log(`второе норм`);
    
    return res.redirect(`http://localhost:5500/smptr.html?login=${loginEncoded}&avatar=${avatarEncoded}`);
  }
);


app.listen(PORT, () => {
    console.log(`Сервер API запущен на http://localhost:${PORT}`);
});


app.get('/api/v1/movie-details/:id', (req, res) => {
    const movieId = req.params.id;
    const sqlQuery = "SELECT * FROM film_solo WHERE id = ?"; 
    
    connection.query(sqlQuery, [movieId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: "Фильм не найден в базе данных film_solo" });
        }
        res.json(results[0]); 
    });
});
