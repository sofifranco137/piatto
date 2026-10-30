import { useRef } from 'react';
import Book from './Book';
import { useBookTilt } from '../hooks/useBookTilt';
import logo from '../assets/logo-piatto-claro.png';

const LINKS = [['recetas', 'Recetas'], ['alacena', 'Mi alacena'], ['lista', 'Lista del súper']];

// Banner de la app con el recetario 3D, el menú y el nombre de quien inició sesión
function Hero({ recipes, user, onGo, onNewRecipe, onSignOut }) {
  const heroRef = useRef(null);
  useBookTilt(heroRef);

  const firstName = (user?.displayName || user?.email?.split('@')[0] || '').split(' ')[0];

  return (
    <header className="hero" ref={heroRef}>
      <nav className="topbar">
        <a className="brand" href="#">
          <img className="brand-logo" src={logo} alt="" width="58" height="44" />
          Piatto
        </a>
        <div className="topbar-right">
          <div className="topbar-links">
            {LINKS.map(([key, label]) => <a key={key} href="#app" onClick={() => onGo(key)}>{label}</a>)}
          </div>
          <div className="user-chip">
            <span>Hola, {firstName}</span>
            <button className="btn btn-small btn-ghost-light" type="button" onClick={onSignOut}>Cerrar sesión</button>
          </div>
        </div>
      </nav>

      <div className="hero-inner">
        <div className="hero-copy">
          <h1>Cociná con lo que hay en casa.</h1>
          <p>Guardá tus recetas, armá la lista del súper sin olvidarte nada y descubrí qué podés cocinar hoy con lo que tenés en la alacena.</p>
          <div className="hero-actions">
            <a className="btn btn-butter" href="#app" onClick={() => onGo('alacena')}>Ver qué puedo cocinar</a>
            <button className="btn btn-ghost-light" type="button" onClick={onNewRecipe}>Cargar una receta</button>
          </div>
        </div>
        <div className="scene" aria-hidden="true">
          <div className="layer book-layer" style={{ '--d': 6 }}>
            <Book recipes={recipes} />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Hero;
