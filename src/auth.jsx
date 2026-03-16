export default function Auth({ onLogin, error, loading }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#FAF7F2", fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{
        background: "white", borderRadius: 20, padding: "48px 40px", width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(42,33,24,0.12)", border: "1px solid #E8DDD0"
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 28, color: "#2A2118", marginBottom: 6 }}>SoDiet</div>
          <div style={{ fontSize: 11, color: "#C4956A", letterSpacing: "2px", textTransform: "uppercase" }}>Espace praticien</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#8A7968", display: "block", marginBottom: 4 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="votre@email.com"
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E8DDD0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#8A7968", display: "block", marginBottom: 4 }}>Mot de passe</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E8DDD0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {error && (
            <div style={{ background: "#fff0ee", border: "1px solid #f5c0b8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#c8503c", marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "12px", background: "#C4956A", color: "white", border: "none",
            borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit"
          }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}