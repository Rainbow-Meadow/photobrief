import { Navigate, useParams } from "react-router-dom";

/**
 * Friendly entry point for invite links shared as `/beta-invite/:token`.
 * Forwards to /signup?invite=… so the SignupPage owns all validation logic.
 */
export default function BetaInvitePage() {
  const { token } = useParams();
  if (!token) return <Navigate to="/waitlist" replace />;
  return <Navigate to={`/signup?invite=${encodeURIComponent(token)}`} replace />;
}
