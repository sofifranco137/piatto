const COLORS = ['#F5A23A', '#9DC29A', '#F2C2A6', '#F2A9C0', '#E8D27A', '#C9B8F2', '#BFE3D4'];

// Color fijo para cada persona según el orden en que entró al grupo
export const memberColor = (group, uid) => COLORS[Math.max(0, group.members.indexOf(uid)) % COLORS.length];
export const memberName = (group, uid, myUid) => (uid === myUid ? 'Vos' : group.names?.[uid] || 'Alguien');

function Avatar({ group, uid, myUid, small }) {
  const me = uid === myUid;
  const label = me ? 'Vos' : memberName(group, uid, myUid).slice(0, 2);
  return (
    <span className={`avatar ${me ? 'me' : ''}`} style={{ '--av': memberColor(group, uid) }} title={memberName(group, uid, myUid)}>
      {small && me ? 'Vo' : label}
    </span>
  );
}

export default Avatar;
