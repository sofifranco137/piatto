// Se muestra si falta el archivo .env (o las variables en Vercel)
function SetupNotice({ error }) {
  return (
    <main className="app setup">
      <div className="list-paper">
        <h2>{error ? 'No se pudo conectar con Firebase' : 'Falta conectar Firebase'}</h2>
        {error ? (
          <p className="muted">{error}</p>
        ) : (
          <>
            <p className="muted">La app no encontró los datos de conexión. Para arreglarlo:</p>
            <ol className="setup-steps">
              <li>Copiá <code>.env.example</code> como <code>.env</code> en la raíz del proyecto.</li>
              <li>Completalo con los datos de tu app web de Firebase.</li>
              <li>Reiniciá <code>npm run dev</code>.</li>
            </ol>
            <p className="muted">En Vercel, las mismas variables van en Settings → Environment Variables, y después hay que hacer Redeploy.</p>
          </>
        )}
      </div>
    </main>
  );
}

export default SetupNotice;
