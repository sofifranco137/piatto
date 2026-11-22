import { useState } from 'react';
import Avatar, { memberName } from './Avatar';
import { NewGroupDialog, ShareDialog } from './GroupDialogs';
import { MomentViewer, momentCount } from './MomentDialogs';
import { useToast } from './Toasts';
import { useMoments } from '../hooks/useMoments';
import { deleteMoment, MAX_MOMENTS, photosOf, restoreMoment } from '../services/moments';
import { formatDate } from '../lib/photos';
import { friendlyError } from '../lib/errors';

// Pestaña "Sobremesa": fotos de la gente con la que compartiste lo que cocinaste.
// album = null es el álbum privado (Solo yo); si no, el id de un grupo.
function SobremesaPanel({ user, groups, album, setAlbum, recipes, onUpload, onEdit, onCreateGroup }) {
  const toast = useToast();
  const myUid = user.uid;
  const group = groups.data.find((g) => g.id === album) || null;
  const moments = useMoments(myUid, group ? group.id : null); // CONSULTAR, en tiempo real
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(null); // null | 'new' | 'share'
  const open = moments.data.find((m) => m.id === openId) || null;
  const others = group ? group.members.filter((u) => u !== myUid) : [];

  async function remove(m) {                                           // ELIMINAR
    const where = group ? group.id : null;
    await deleteMoment(myUid, where, m.id);
    setOpenId(null);
    toast('Eliminaste el momento.', { undo: () => restoreMoment(myUid, where, m) });
  }

  return (
    <section className="panel" role="tabpanel">
      <div className="list-bar wide">
        <div className="list-switch" role="group" aria-label="Tus álbumes">
          <button type="button" className="list-pill" aria-pressed={!group} onClick={() => setAlbum(null)}>
            <span aria-hidden="true">🔒</span> Solo yo
          </button>
          {groups.data.map((g) => (
            <button key={g.id} type="button" className="list-pill" aria-pressed={group?.id === g.id} onClick={() => setAlbum(g.id)}>
              {g.name}
              <span className="avatars sm">{g.members.slice(0, 4).map((uid) => <Avatar key={uid} group={g} uid={uid} myUid={myUid} small />)}</span>
            </button>
          ))}
        </div>
        <button type="button" className="list-pill new" onClick={() => setCreating(true)}>
          + <span className="tl">Nuevo grupo</span><span className="ts">Grupo</span>
        </button>
      </div>

      <div className="album-head">
        <div>
          <h2>{group ? group.name : 'Mi sobremesa'}</h2>
          <p className="muted">
            {!group ? 'Tu álbum privado: solo vos ves estas fotos.'
              : others.length ? `Las ven ${others.map((u) => memberName(group, u, myUid)).join(', ')} y vos.`
                : 'Por ahora sos la única persona del grupo. Mandá el link para que se sumen.'}
          </p>
        </div>
        <div className="panel-tools">
          {group && <button type="button" className="btn btn-outline" onClick={() => setSharing('share')}>Invitar</button>}
          <button type="button" className="btn btn-primary" onClick={() => onUpload(group ? group.id : null)}>+ Subir foto</button>
        </div>
      </div>

      {moments.error && <div className="alert" role="alert"><strong>No se pudieron leer las fotos</strong>{friendlyError(moments.error)}</div>}

      <div className="album">
        {moments.loading && [0, 1, 2].map((i) => <div key={i} className="skeleton polaroid-skeleton" />)}

        {!moments.loading && !moments.data.length && (
          <div className="empty">
            <strong>{group ? `Todavía no hay fotos en ${group.name}` : 'Tu sobremesa está vacía'}</strong>
            <span>
              {group ? 'Subí la primera foto de la juntada: la van a ver todas las personas del grupo.'
                : 'Guardá una foto de la gente con la que compartiste lo que cocinaste. No hace falta que sea la comida.'}
            </span>
            <button type="button" className="btn btn-butter" onClick={() => onUpload(group ? group.id : null)}>Subir la primera foto</button>
          </div>
        )}

        {moments.data.map((m, i) => {
          const photos = photosOf(m);
          return (
          <figure key={m.id} className={`polaroid ${photos.length > 1 ? 'stack' : ''}`} style={{ '--tilt': `${[-1.6, 1.2, -0.6, 1.8, -1.1][i % 5]}deg` }}>
            <button type="button" className="polaroid-open" onClick={() => setOpenId(m.id)}
              aria-label={`Ver ${photos.length > 1 ? `las ${photos.length} fotos` : 'la foto'} con ${m.people}`}>
              <img src={photos[0]?.src} alt="" loading="lazy" />
              {photos.length > 1 && <span className="photo-count" aria-hidden="true">1/{photos.length}</span>}
            </button>
            <figcaption>
              <strong>{m.recipeName || 'Sobremesa'}</strong>
              <span>con {m.people}</span>
              <small>{formatDate(m.date)}{group && m.addedBy !== myUid ? ` · subió ${memberName(group, m.addedBy, myUid)}` : ''}</small>
            </figcaption>
          </figure>
          );
        })}
      </div>

      {moments.data.length >= MAX_MOMENTS && (
        <p className="muted album-note">Se muestran las últimas {momentCount(MAX_MOMENTS)}.</p>
      )}

      <MomentViewer
        moment={open} group={group} myUid={myUid} onClose={() => setOpenId(null)} onDelete={remove}
        onEdit={(m) => { setOpenId(null); onEdit(group ? group.id : null, m); }}
      />
      <NewGroupDialog
        open={creating} recipes={recipes} onClose={() => setCreating(false)}
        onCreate={async (name, items) => { const id = await onCreateGroup(name, items, 'sobremesa'); setCreating(false); setAlbum(id); setSharing('new'); }}
      />
      <ShareDialog group={sharing ? group : null} justCreated={sharing === 'new'} onClose={() => setSharing(null)} />
    </section>
  );
}

export default SobremesaPanel;
