import './Promises.css';

const PROMISES = [
  { n: '01', title: 'Elige tu butaca', body: 'Mapa de la sala en tiempo real: ves cómo se ocupa mientras eliges.' },
  { n: '02', title: 'Te la guardamos', body: 'Diez minutos reservada solo para ti mientras completas el pago.' },
  { n: '03', title: 'Sin overbooking', body: 'Cada butaca se vende una sola vez, aunque mil personas pulsen a la vez.' },
];

export function Promises() {
  return (
    <div className="promises">
      {PROMISES.map((p) => (
        <div key={p.n} className="promise">
          <span className="promise__n">{p.n}</span>
          <h3>{p.title}</h3>
          <p className="muted">{p.body}</p>
        </div>
      ))}
    </div>
  );
}
