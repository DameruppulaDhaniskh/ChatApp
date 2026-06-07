import { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

export default function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username) {
      setError('Please enter your username.');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/forgot-password', { username });
      setSuccess(response.data.message || 'Reset instructions sent to your username!');
      setUsername('');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card card-custom shadow-lg border-0">
            <div className="card-body p-5">
              <h3 className="card-title text-center mb-4 fw-bold text-primary">Forgot Password</h3>
              <p className="text-muted text-center mb-4">
                Enter your username below and we'll send you reset instructions.
              </p>
              
              {error && <div className="alert alert-danger" role="alert">{error}</div>}
              {success && <div className="alert alert-success" role="alert">{success}</div>}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label fw-semibold">Username</label>
                  <input 
                    type="text" 
                    className="form-control form-control-lg form-input-custom" 
                    id="username" 
                    placeholder="Enter your username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg w-100 mb-3 shadow-sm rounded-3 fw-bold"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Instructions'}
                </button>
                <div className="text-center mt-3">
                  <Link to="/login" className="text-decoration-none fw-semibold text-primary">
                    Back to Login
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}