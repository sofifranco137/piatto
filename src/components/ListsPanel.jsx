import { useState } from 'react';
import ShoppingList from './ShoppingList';
import GroupList from './GroupList';
import Avatar from './Avatar';
import { NewGroupDialog } from './GroupDialogs';

// Pestaña "Lista del súper": mi lista personal + los grupos compartidos
function ListsPanel({ user, groups, active, setActive, recipes, personal, onCreateGroup, justCreated }) {
  const [creating, setCreating] = useState(false);
  const group = groups.data.find((g) => g.id === active);
  const pendingMine = personal.list.filter((i) => !i.checked).length;

  return (
    <section className="panel" role="tabpanel">
      <div className="list-bar">
        <div className="list-switch" role="group" aria-label="Tus listas">
          <button type="button" className="list-pill" aria-pressed={!group} onClick={() => setActive(null)}>
            Mi lista <span className="count">{pendingMine}</span>
          </button>
          {groups.data.map((g) => (
            <button key={g.id} type="button" className="list-pill" aria-pressed={group?.id === g.id} onClick={() => setActive(g.id)}>
              {g.name}
              <span className="avatars sm">{g.members.slice(0, 4).map((uid) => <Avatar key={uid} group={g} uid={uid} myUid={user.uid} small />)}</span>
            </button>
          ))}
        </div>
        <button type="button" className="list-pill new" onClick={() => setCreating(true)}>
          + <span className="tl">Nuevo grupo</span><span className="ts">Grupo</span>
        </button>
      </div>

      {group
        ? <GroupList key={group.id} group={group} user={user} justCreated={justCreated === group.id} onGone={() => setActive(null)} />
        : <ShoppingList {...personal} />}

      <NewGroupDialog
        open={creating} recipes={recipes} onClose={() => setCreating(false)}
        onCreate={async (name, items) => { await onCreateGroup(name, items); setCreating(false); }}
      />
    </section>
  );
}

export default ListsPanel;
