import { useEffect, useState } from 'react';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import { memberName } from './Avatar';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';
import { compressImage, formatDate, MAX_PHOTOS, photoError, todayISO } from '../lib/photos';
import { plural } from '../lib/ingredients';
import { photosOf } from '../services/moments';

/* ---------- Subir o editar un momento ---------- */
// preset: { album, recipeId } para uno nuevo, o { album, edit: momento } para editar
export function MomentDialog({ preset, recipes, groups, myUid, onClose, onSave }) {
  return (
    <Modal open={!!preset} onClose={onClose} labelledBy="moment-title">
      {preset && <MomentForm preset={preset} recipes={recipes} groups={groups} myUid={myUid} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function MomentForm({ preset, recipes, groups, myUid, onClose, onSave }) {
  const toast = useToast();
  const edit = preset.edit || null;
  const [photos, setPhotos] = useState(edit ? photosOf(edit) : []); // [{ src, width, height }]
  const [preparing, setPreparing] = useState(false);
  const [recipeId, setRecipeId] = useState(edit ? edit.recipeId || '' : preset.recipeId || '');
  const [people, setPeople] = useState(edit?.people || '');
  const [date, setDate] = useState(edit?.date || todayISO());
  const [caption, setCaption] = useState(edit?.caption || '');
  const [album, setAlbum] = useState(preset.album || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const group = groups.find((g) => g.id === album);
  const others = group ? group.members.filter((u) => u !== myUid).map((u) => memberName(group, u, myUid)) : [];
  const free = MAX_PHOTOS - photos.length;

  // Agregar fotos: se pueden elegir varias a la vez, hasta completar 3
  async function pick(e) {
    const files = [...(e.target.files || [])];
    e.target.value = ''; // permite volver a elegir la misma foto
    if (!files.length) return;
    if (files.length > free) toast(`Solo entran ${plural(MAX_PHOTOS, 'foto', 'fotos')} por momento: sumamos las primeras ${free}.`);
    setPreparing(true);
    try {
      const ready = [];
      for (const f of files.slice(0, free)) ready.push(await compressImage(f));
      setPhotos((p) => [...p, ...ready.map(({ dataUrl, width, height }) => ({ src: dataUrl, width, height }))].slice(0, MAX_PHOTOS));
      setErrors((x) => ({ ...x, photos: '' }));
    } catch (err) {
      setErrors((x) => ({ ...x, photos: photoError(err) }));
    } finally {
      setPreparing(false);
    }
  }

  const removePhoto = (i) => setPhotos((p) => p.filter((_, j) => j !== i));
  const makeCover = (i) => setPhotos((p) => [p[i], ...p.filter((_, j) => j !== i)]);

  async function submit(e) {
    e.preventDefault();
    // Validaciones básicas
    const errs = {};
    if (!photos.length) errs.photos = 'Elegí al menos una foto.';
    if (people.trim().length < 2) errs.people = 'Contá con quién la compartiste.';
    if (!date || date > todayISO()) errs.date = 'Elegí una fecha de hoy o de antes.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const r = recipes.find((x) => x.id === recipeId);
    try {
      await onSave(album || null, { photos, recipeId: r?.id, recipeName: r?.name, people, caption, date }, edit?.id);
    } catch (err) {
      toast(friendlyError(err), 'error');
      setSaving(false);
    }
  }

  return (
    <form className="detail" onSubmit={submit} noValidate>
      <div className="sheet-head">
        <h3 id="moment-title">{edit ? 'Editar el momento' : 'Guardar un momento'}</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      {!edit && <p className="muted">No hace falta que sea la comida: lo que importa es con quién la compartiste.</p>}

      <div className="field">
        <span>Fotos <span className="optional">(hasta {MAX_PHOTOS}; la primera es la portada)</span></span>
        <div className="photo-slots" aria-invalid={!!errors.photos}>
          {photos.map((p, i) => (
            <div key={p.src.slice(-40) + i} className="photo-slot">
              <img src={p.src} alt={`Foto ${i + 1}`} />
              {i === 0 ? <span className="slot-tag">Portada</span>
                : <button type="button" className="slot-tag as-btn" onClick={() => makeCover(i)}>Hacer portada</button>}
              <button type="button" className="slot-remove" onClick={() => removePhoto(i)} aria-label={`Sacar la foto ${i + 1}`}>✕</button>
            </div>
          ))}
          {free > 0 && (
            <label className="photo-slot add">
              <input type="file" accept="image/*" multiple onChange={pick} />
              {preparing
                ? <span className="photo-drop-msg"><span className="spinner" />Preparando…</span>
                : <span className="photo-drop-msg"><strong>+ {photos.length ? 'Agregar' : 'Elegir fotos'}</strong>{photos.length ? `Te quedan ${free}` : 'o sacalas con el celular'}</span>}
            </label>
          )}
        </div>
        <span className="field-error">{errors.photos}</span>
      </div>

      <label className="field">¿Con quién la compartiste?
        <input type="text" value={people} onChange={(e) => { setPeople(e.target.value); setErrors((x) => ({ ...x, people: '' })); }} maxLength={80}
          placeholder="Ej: Martina, Juli y la abuela" aria-invalid={!!errors.people} />
        <span className="field-error">{errors.people}</span>
      </label>

      <div className="field-row">
        <label className="field"><span>Qué cocinaste <span className="optional">(opcional)</span></span>
          <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            <option value="">Ninguna receta</option>
            {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            {edit?.recipeId && !recipes.some((r) => r.id === edit.recipeId) && <option value={edit.recipeId}>{edit.recipeName}</option>}
          </select>
        </label>
        <label className="field">Fecha
          <input type="date" value={date} max={todayISO()} onChange={(e) => { setDate(e.target.value); setErrors((x) => ({ ...x, date: '' })); }} aria-invalid={!!errors.date} />
        </label>
      </div>
      {errors.date && <span className="field-error">{errors.date}</span>}

      <label className="field"><span>Un recuerdo <span className="optional">(opcional)</span></span>
        <textarea rows="2" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={140}
          placeholder="Ej: la primera vez que nos salió la masa" />
      </label>

      <label className="field">Dónde la guardás
        <select value={album} onChange={(e) => setAlbum(e.target.value)} disabled={!!edit}>
          <option value="">Solo yo (privado)</option>
          {groups.map((g) => <option key={g.id} value={g.id}>Grupo: {g.name}</option>)}
        </select>
        <span className="field-hint">
          {edit ? 'Para pasarla a otro álbum, eliminala y subila de nuevo.'
            : !group ? 'Solo vos vas a ver estas fotos.'
              : others.length ? `Las van a ver ${others.join(', ')} y vos.`
                : 'Por ahora sos la única persona del grupo. Mandá el link para que se sumen.'}
        </span>
      </label>

      <div className="sheet-foot">
        <button type="button" className="btn btn-text" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving || preparing}>
          {saving ? <><span className="spinner" />Guardando…</> : edit ? 'Guardar cambios' : 'Guardar momento'}
        </button>
      </div>
    </form>
  );
}

/* ---------- Ver un momento grande ---------- */
export function MomentViewer({ moment, group, myUid, onClose, onEdit, onDelete }) {
  const [index, setIndex] = useState(0);
  const photos = moment ? photosOf(moment) : [];
  const n = photos.length;
  const current = photos[Math.min(index, n - 1)];
  const mine = moment && (!group || moment.addedBy === myUid);
  const canDelete = moment && (mine || group?.owner === myUid);

  useEffect(() => { setIndex(0); }, [moment?.id]);
  // Flechas del teclado para pasar las fotos
  useEffect(() => {
    if (!moment || n < 2) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % n);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + n) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moment, n]);

  return (
    <Modal open={!!moment} onClose={onClose} className="sheet sheet-photo" labelledBy="viewer-title">
      {moment && current && (
        <div className="detail">
          <div className="sheet-head">
            <h3 id="viewer-title">{moment.recipeName || 'Sobremesa'}</h3>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
          <div className="viewer-stage">
            <img className="viewer-img" src={current.src} width={current.width} height={current.height}
              alt={`Foto ${index + 1} de ${n}, con ${moment.people}${moment.recipeName ? `, el día de ${moment.recipeName}` : ''}`} />
            {n > 1 && (
              <>
                <button type="button" className="viewer-arrow prev" onClick={() => setIndex((i) => (i - 1 + n) % n)} aria-label="Foto anterior">‹</button>
                <button type="button" className="viewer-arrow next" onClick={() => setIndex((i) => (i + 1) % n)} aria-label="Foto siguiente">›</button>
                <div className="viewer-dots">
                  {photos.map((_, i) => <button key={i} type="button" aria-label={`Ver la foto ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} />)}
                </div>
              </>
            )}
          </div>
          <div className="viewer-info">
            <p><strong>Con {moment.people}</strong> · {formatDate(moment.date)}</p>
            {moment.caption && <p className="viewer-caption">“{moment.caption}”</p>}
            {group && <p className="muted">{moment.addedBy === myUid ? 'Lo subiste vos.' : `Lo subió ${memberName(group, moment.addedBy, myUid)}.`}</p>}
          </div>
          {(mine || canDelete) && (
            <div className="sheet-foot spread">
              {canDelete
                ? <AsyncButton className="btn btn-text danger-solid" pendingLabel="Eliminando…" onClick={() => onDelete(moment)}>Eliminar</AsyncButton>
                : <span />}
              {mine && <button type="button" className="btn btn-outline" onClick={() => onEdit(moment)}>Editar o cambiar fotos</button>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export const momentCount = (n) => plural(n, 'foto', 'fotos');
