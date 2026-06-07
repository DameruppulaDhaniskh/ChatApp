import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [friendships, setFriendships] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const token = localStorage.getItem('token');
  let user = null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      user = JSON.parse(userStr);
    }
  } catch (e) {
    console.error('Error parsing user data', e);
  }

  const currentUserId = user ? user.id : null;

  const fetchFriendships = async () => {
    if (!token) return;
    try {
      const response = await axiosInstance.get('/friendships');
      setFriendships(response.data);
    } catch (err) {
      console.error('Error fetching friendships in Header:', err);
    }
  };

  useEffect(() => {
    if (!token) return;

    fetchFriendships();
    
    // Set up a 5-second poll for incoming requests
    const interval = setInterval(fetchFriendships, 5000);
    
    // Listen to local actions
    const handleFriendshipChange = () => {
      fetchFriendships();
    };
    
    window.addEventListener('friendship-changed', handleFriendshipChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('friendship-changed', handleFriendshipChange);
    };
  }, [token]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!dropdownOpen && !requestsOpen) return;
    
    const handleDocumentClick = () => {
      setDropdownOpen(false);
      setRequestsOpen(false);
    };
    
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [dropdownOpen, requestsOpen]);

  // Close hamburger menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    setDropdownOpen(false);
    setRequestsOpen(false);
    setIsMenuOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setDropdownOpen(!dropdownOpen);
    setRequestsOpen(false);
  };

  const toggleRequestsDropdown = (e) => {
    e.stopPropagation();
    setRequestsOpen(!requestsOpen);
    setDropdownOpen(false);
  };

  const handleAccept = async (friendId, e) => {
    if (e) e.stopPropagation();
    try {
      await axiosInstance.post('/friendships/accept', { senderId: friendId });
      await fetchFriendships();
      window.dispatchEvent(new Event('friendship-changed'));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept request');
    }
  };

  const handleReject = async (friendId, e) => {
    if (e) e.stopPropagation();
    try {
      await axiosInstance.post('/friendships/reject', { otherUserId: friendId });
      await fetchFriendships();
      window.dispatchEvent(new Event('friendship-changed'));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject request');
    }
  };

  // Filter for incoming pending requests
  const incomingRequests = friendships.filter(
    f => f.status === 'pending' && f.sender_id !== currentUserId
  );

  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-custom py-3 shadow-sm">
      <div className="container-fluid px-3 px-md-4">
        <button 
          className="navbar-brand btn btn-link text-white text-decoration-none p-0 fw-bold fs-4 d-flex align-items-center"
          onClick={() => {
            setDropdownOpen(false);
            setRequestsOpen(false);
            setIsMenuOpen(false);
            navigate(token ? '/home' : '/login');
          }}
        >
          <span className="me-2" style={{ fontSize: '1.6rem' }}>💬</span> ChatApp
        </button>

        {/* Custom React Hamburger Toggler */}
        <button 
          className="navbar-toggler shadow-none border-0" 
          type="button" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`} id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center w-100 justify-content-end pt-3 pt-lg-0">
            {token ? (
              <>
                {/* Mobile User Profile details */}
                <li className="nav-item d-lg-none border-bottom border-light border-opacity-10 w-100 text-center pb-2 mb-2">
                  <span className="text-white opacity-75 small">👤 {user?.full_name} ({user?.email})</span>
                </li>

                <li className="nav-item w-100 text-center w-lg-auto">
                  <button 
                    className="nav-link btn btn-link text-white text-decoration-none px-3 py-2 w-100 text-center w-lg-auto"
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/home');
                    }}
                  >
                    Home
                  </button>
                </li>

                {/* Mobile Friend Requests (Flat menu listing) */}
                <li className="nav-item w-100 d-lg-none text-center">
                  <button 
                    className="nav-link btn btn-link text-white text-decoration-none py-2 w-100"
                    onClick={() => setRequestsOpen(!requestsOpen)}
                  >
                    Friend Requests {incomingRequests.length > 0 && `(${incomingRequests.length})`}
                  </button>
                  {requestsOpen && (
                    <div className="bg-dark bg-opacity-25 rounded p-2 mx-3 my-1 text-white text-start shadow-inner">
                      <div className="fw-bold border-bottom border-secondary pb-1 mb-2 small text-muted">Pending Requests</div>
                      {incomingRequests.length === 0 ? (
                        <div className="text-center py-2 text-white-50 small">No requests</div>
                      ) : (
                        incomingRequests.map(req => {
                          const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.friend_name)}&backgroundType=gradientLinear&fontSize=42`;
                          return (
                            <div key={req.id} className="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                              <div className="d-flex align-items-center text-truncate me-2">
                                <img src={avatarUrl} alt={req.friend_name} className="rounded-circle me-2" width="28" height="28" />
                                <span className="small text-truncate">{req.friend_name}</span>
                              </div>
                              <div className="d-flex gap-1">
                                <button className="btn btn-success btn-sm px-2 py-0" onClick={(e) => handleAccept(req.friend_id, e)}>✓</button>
                                <button className="btn btn-danger btn-sm px-2 py-0" onClick={(e) => handleReject(req.friend_id, e)}>✗</button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </li>

                {/* Desktop Friend Requests Dropdown */}
                <li className="nav-item dropdown d-none d-lg-block me-3 position-relative">
                  <button 
                    className="nav-link btn btn-link text-white text-decoration-none p-1 position-relative" 
                    id="requestsDropdown"
                    onClick={toggleRequestsDropdown}
                    aria-expanded={requestsOpen}
                    style={{ fontSize: '1.25rem' }}
                    title="Friend Requests"
                  >
                    👥
                    {incomingRequests.length > 0 && (
                      <span 
                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" 
                        style={{ fontSize: '0.65rem', padding: '0.25em 0.5em' }}
                      >
                        {incomingRequests.length}
                      </span>
                    )}
                  </button>
                  <ul 
                    className={`dropdown-menu dropdown-menu-end shadow p-2 ${requestsOpen ? 'show' : ''}`} 
                    aria-labelledby="requestsDropdown"
                    style={{ width: '310px', maxHeight: '380px', overflowY: 'auto', border: 'none', borderRadius: '12px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <li className="dropdown-header border-bottom pb-2 mb-2 fw-bold text-dark text-start">
                      Friend Requests ({incomingRequests.length})
                    </li>
                    {incomingRequests.length === 0 ? (
                      <li className="text-center py-4 text-muted small">
                        <div className="fs-3 mb-1">😴</div>
                        No requests
                      </li>
                    ) : (
                      incomingRequests.map(req => {
                        const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.friend_name)}&backgroundType=gradientLinear&fontSize=42`;
                        return (
                          <li 
                            key={req.id} 
                            className="dropdown-item-text d-flex align-items-center justify-content-between py-2 px-1 border-bottom border-light"
                          >
                            <div className="d-flex align-items-center text-truncate me-2">
                              <img 
                                src={avatarUrl} 
                                alt={req.friend_name} 
                                className="rounded-circle me-2 border shadow-sm" 
                                width="36" 
                                height="36" 
                              />
                              <div className="text-start text-truncate" style={{ maxWidth: '140px' }}>
                                <div className="fw-semibold text-dark text-truncate small">{req.friend_name}</div>
                                <small className="text-muted d-block text-truncate" style={{ fontSize: '0.65rem' }}>
                                  {req.friend_email}
                                </small>
                              </div>
                            </div>
                            <div className="d-flex gap-1 flex-shrink-0">
                              <button 
                                className="btn btn-success btn-sm px-2 py-1 fw-bold" 
                                style={{ fontSize: '0.75rem' }}
                                onClick={(e) => handleAccept(req.friend_id, e)}
                                title="Accept Request"
                              >
                                ✓
                              </button>
                              <button 
                                className="btn btn-outline-danger btn-sm px-2 py-1" 
                                style={{ fontSize: '0.75rem' }}
                                onClick={(e) => handleReject(req.friend_id, e)}
                                title="Reject Request"
                              >
                                ✗
                              </button>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </li>

                {/* Desktop Profile Dropdown */}
                <li className="nav-item dropdown d-none d-lg-block">
                  <button 
                    className="nav-link dropdown-toggle btn btn-link text-white text-decoration-none fw-semibold" 
                    id="profileDropdown"
                    onClick={toggleDropdown}
                    aria-expanded={dropdownOpen}
                  >
                    👤 {user?.full_name || 'Profile'}
                  </button>
                  <ul 
                    className={`dropdown-menu dropdown-menu-end shadow ${dropdownOpen ? 'show' : ''}`} 
                    aria-labelledby="profileDropdown"
                    style={{ border: 'none', borderRadius: '12px' }}
                  >
                    <li className="dropdown-header border-bottom pb-2 mb-2 text-start">
                      <div className="fw-bold text-dark">{user?.full_name}</div>
                      <small className="text-muted">{user?.email}</small>
                    </li>
                    <li>
                      <button 
                        className="dropdown-item py-2" 
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/home');
                        }}
                      >
                        Dashboard
                      </button>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item py-2 text-danger fw-semibold" onClick={handleLogout}>
                        Logout
                      </button>
                    </li>
                  </ul>
                </li>

                {/* Mobile Logout Button */}
                <li className="nav-item w-100 d-lg-none text-center mt-3 mb-2">
                  <button 
                    className="btn btn-danger btn-sm w-75 py-2 fw-bold rounded-pill"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item w-100 text-center w-lg-auto">
                  <button 
                    className="nav-link btn btn-link text-white text-decoration-none px-3 py-2 w-100 w-lg-auto"
                    onClick={() => navigate('/login')}
                  >
                    Login
                  </button>
                </li>
                <li className="nav-item w-100 text-center w-lg-auto mt-2 mt-lg-0">
                  <button 
                    className="btn btn-outline-light btn-sm px-4 py-2 rounded-pill w-75 w-lg-auto"
                    onClick={() => navigate('/register')}
                  >
                    Register
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}