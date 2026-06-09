// Clears the site-access cookie and redirects to the lock page.
// Accessible at /unlock/logout
export function getServerSideProps({ res }) {
  res.setHeader(
    "Set-Cookie",
    "finzo_access=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
  );
  return { redirect: { destination: "/unlock", permanent: false } };
}

export default function Logout() {
  return null;
}
