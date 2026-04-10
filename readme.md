> [!IMPORTANT]

<h1 align="center">
    <!-- <a href="https://chesssignal.aidenpearce.space"><img width="175" src="https://github.com/user-attachments/assets/9a33a746-c9cd-43b8-b17b-564f3f6ce4a2" /></a> -->
    <br>
    Ken-Miles Chess Game Review
</h1>

<p align="center">
    A website that analyses Chess games with move classifications, for free.
</p>

<p align="center">
    📌 <a href="https://chesssignal.aidenpearce.space/"><b>chesssignal.aidenpearce.space</b></a>
</p>

<!-- TODO: Update image with current site image, add a description -->
<img width="1000" alt="ChessSignal Website" src="https://github.com/user-attachments/assets/77d98631-07d4-4ccc-83ef-32f6b3e1d6dd" />

> Originally <a href="https://github.com/wintrcat/wintrchess">WintrChess Game Report</a>, the site has been significantly improved on and rebranded as ChessSignal with many new features, including:

- Support for loading games by chess.com game URL (not just username)
- Stockfish 18 engine support for improved analysis
- A restructured API with versioning and internal vs public route layout
- Local and server-side caching of game data and evaluations for improved performance and reduced load on chess provider endpoints
- A new board UI with multiple themes and presets to choose from
- Ongoing game support with (currently limited) live move and time data updates

## 📂 Project

The ChessSignal repository is a monorepo made up of three packages:

#### `client`
The frontend for the website built with React and TypeScript.

#### `server`
The backend for the website where the website content is served, and where any API endpoints will live.

#### `shared`
Libraries, some types and common logic is stored here and can be accessed by both other packages.

## 📚 Documentation

[Hosting ChessSignal locally](https://github.com/Ken-Miles/ChessSignal/blob/master/docs/hosting.md)

[Contributing to the project](https://github.com/WintrCat/wintrchess/blob/master/docs/contributing.md)
