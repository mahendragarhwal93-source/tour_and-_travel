import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toasts.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function useAuthForm(fields, validate, submitFn, successMsg) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [values, setValues] = useState(fields);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const onChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: undefined });
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;
    setBusy(true);
    try {
      const user = await submitFn(values);
      toast.success(successMsg(user));
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length ? err.fields : {});
      toast.error(err.message);
    } finally { setBusy(false); }
  };
  return { values, errors, busy, onChange, onSubmit };
}

const Field = ({ label, name, type = 'text', form, placeholder, autoComplete }) => (
  <div className="mb-3">
    <label htmlFor={name} className="form-label fw-semibold">{label}</label>
    <input id={name} name={name} type={type} placeholder={placeholder} autoComplete={autoComplete}
      className={`form-control ${form.errors[name] ? 'is-invalid' : ''}`} value={form.values[name]} onChange={form.onChange} />
    {form.errors[name] && <div className="invalid-feedback">{form.errors[name]}</div>}
  </div>
);

export function Login() {
  const { user, login } = useAuth();
  const form = useAuthForm(
    { email: '', password: '' },
    (v) => ({
      ...(!EMAIL_RE.test(v.email) && { email: 'Enter a valid email address.' }),
      ...(!v.password && { password: 'Password is required.' }),
    }),
    (v) => login(v.email, v.password),
    (u) => `Welcome back, ${u.name}!`
  );
  const location = useLocation();
  if (user) return <Navigate to={location.state?.from || '/dashboard'} replace />;

  return (
    <div className="container">
      <div className="panel auth-card">
        <h2 className="fw-bold mb-1">Welcome back</h2>
        <p className="text-muted">Log in to manage your trips and bookings.</p>
        <form onSubmit={form.onSubmit} noValidate>
          <Field form={form} label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
          <Field form={form} label="Password" name="password" type="password" autoComplete="current-password" />
          <button className="btn btn-primary w-100" disabled={form.busy}>{form.busy ? 'Logging in…' : 'Log in'}</button>
        </form>
        <p className="text-center mt-3 mb-0 small">New here? <Link to="/register" state={location.state}>Create an account</Link></p>
        <div className="alert alert-light border small mt-3 mb-0">
          <strong>Demo:</strong> demo@travel.com / demo123 · Admin: admin@travel.com / admin123
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const form = useAuthForm(
    { name: '', email: '', password: '', confirm: '' },
    (v) => ({
      ...(v.name.trim().length < 2 && { name: 'Name must be at least 2 characters.' }),
      ...(!EMAIL_RE.test(v.email) && { email: 'Enter a valid email address.' }),
      ...(v.password.length < 6 && { password: 'Password must be at least 6 characters.' }),
      ...(v.confirm !== v.password && { confirm: 'Passwords do not match.' }),
    }),
    (v) => register(v.name, v.email, v.password),
    (u) => `Account created. Welcome, ${u.name}!`
  );
  const location = useLocation();
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container">
      <div className="panel auth-card">
        <h2 className="fw-bold mb-1">Create account</h2>
        <p className="text-muted">Start planning trips in under a minute.</p>
        <form onSubmit={form.onSubmit} noValidate>
          <Field form={form} label="Full name" name="name" autoComplete="name" />
          <Field form={form} label="Email" name="email" type="email" autoComplete="email" />
          <Field form={form} label="Password" name="password" type="password" autoComplete="new-password" />
          <Field form={form} label="Confirm password" name="confirm" type="password" autoComplete="new-password" />
          <button className="btn btn-primary w-100" disabled={form.busy}>{form.busy ? 'Creating…' : 'Sign up'}</button>
        </form>
        <p className="text-center mt-3 mb-0 small">Already registered? <Link to="/login" state={location.state}>Log in</Link></p>
      </div>
    </div>
  );
}
