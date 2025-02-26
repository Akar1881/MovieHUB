# MovieHUB 🎬

MovieHUB is a powerful and feature-rich movie and TV show streaming platform built with Node.js and Express. It provides a seamless experience for users to watch their favorite movies and TV shows online.

![MovieHUB Screenshot](screenshots/home.jpg)

## Features ✨

- 🎥 Stream movies and TV shows
- 📺 Multiple streaming servers for each content
- 🌟 User ratings and reviews system
- ❤️ Favorite content management
- 🔍 Advanced search functionality
- 👤 User authentication and profiles
- 🎨 Beautiful and responsive UI
- 🛡️ Admin panel for content management
- 📱 Mobile-friendly design
- 👥 Credits system for technicians, designers, and translators
- 👁️ Watch count tracking system
- 🌐 Social media integration

## Tech Stack 🛠️

- **Backend**: Node.js, Express
- **Database**: SQLite3
- **Template Engine**: EJS
- **Authentication**: Express Session
- **File Upload**: Multer
- **Password Hashing**: bcryptjs
- **Styling**: Custom CSS with responsive design

## Installation 🚀

1. Clone the repository:
   ```bash
   git clone https://github.com/Akar1881/MovieHUB.git
   cd moviehub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Visit `http://localhost:3000` in your browser

## Environment Setup 🔧

The application uses a `config.json` file for configuration. Create it in the root directory:

```json
{
  "site": {
    "name": "MovieHub",
    "description": "Watch your favorite movies and TV shows",
    "logo": "/images/logo.png"
  },
  "theme": {
    "primary": "#FFD700",
    "background": "#1A1A1A",
    "text": "#FFFFFF",
    "secondary": "#333333"
  },
  "admin": {
    "email": "admin@example.com",
    "password": "admin123",
    "username": "admin"
  },
  "upload": {
    "poster": {
      "width": 1200,
      "height": 1809
    },
    "allowedTypes": ["image/jpeg", "image/png"]
  },
  "social": {
    "telegram": "https://t.me/moviehub",
    "facebook": "https://facebook.com/moviehub",
    "instagram": "https://instagram.com/moviehub",
    "contact": "mailto:contact@moviehub.com"
  }
}
```

To disable any social media link, set its value to "null" in the config.

## Project Structure 📁

```
moviehub/
├── config.json
├── database/
├── src/
│   ├── database.js
│   ├── index.js
│   ├── public/
│   │   ├── css/
│   │   ├── images/
│   │   └── uploads/
│   ├── routes/
│   │   ├── admin.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── movies.js
│   │   ├── tvshows.js
│   │   └── users.js
│   └── views/
│       ├── admin/
│       ├── auth/
│       ├── movies/
│       ├── tvshows/
│       ├── users/
│       └── partials/
└── package.json
```

## Features in Detail 📝

### For Users 👥

1. **Browse Content**
   - View latest movies and TV shows
   - Search by title
   - Filter by genre, type, and rating
   - Sort by various criteria
   - Track view counts for popular content

2. **Watch Content**
   - Multiple streaming servers
   - Continue watching feature
   - Full-screen mode
   - View count tracking

3. **User Features**
   - Create an account
   - Add reviews and ratings
   - Save favorites
   - Manage profile

4. **Credits Information**
   - View technicians who worked on the content
   - See poster designers' credits
   - Check translators who provided subtitles
   - Scrollable credits list for large teams

### For Admins 👑

1. **Content Management**
   - Add/edit/delete movies and TV shows
   - Manage streaming servers
   - Upload posters
   - Organize content by genre

2. **Credits Management**
   - Add/edit technicians for each content
   - Manage poster designers' credits
   - Update translators' information
   - Easy-to-use interface for managing credits

3. **User Management**
   - View user list
   - Manage user roles
   - Remove inappropriate reviews

## Screenshots 📸

### Home Page
![Home Page](screenshots/home.jpg)

### Movie Details
![Movie Details](screenshots/moviepage.jpg)

### TV Show Page
![TV Show Page](screenshots/tvshows.jpg)

### Admin Dashboard
![Admin Dashboard](screenshots/admin.jpg)

## Contributing 🤝

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a new branch: `git checkout -b feature-name`
3. Make your changes
4. Commit your changes: `git commit -m 'Add some feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

Please make sure to:
- Follow the existing code style
- Add comments for new functions
- Update documentation if needed
- Test your changes thoroughly

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 💬

If you have any questions or need help, please:
1. Check the [issues](https://github.com/Akar1881/MovieHUB/issues) page
2. Create a new issue if needed
3. Join our community discussions

## Acknowledgments 🙏

- Thanks to all contributors
- Special thanks to the open-source community
- Icon pack by FontAwesome
