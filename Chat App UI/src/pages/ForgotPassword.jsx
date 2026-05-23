export default function ForgotPassword() {
  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title text-center mb-4">Forgot Password</h3>
              <p className="text-muted text-center mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input type="email" className="form-control" id="email" placeholder="Enter your email" />
                </div>
                <button type="submit" className="btn btn-primary w-100 mb-3">Send Reset Link</button>
                <div className="text-center">
                  <a href="/login" className="text-decoration-none">Back to Login</a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}