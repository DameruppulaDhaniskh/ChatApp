import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [friendships, setFriendships] = useState([]);
  
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

  // Close dropdown when clicking outside of it
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

  const handleLogout = () => {
    setDropdownOpen(false);
    setRequestsOpen(false);
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
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div className="container-fluid">
        <button 
          className="navbar-brand btn btn-link text-white text-decoration-none p-0 fw-bold fs-4"
          onClick={() => {
            setDropdownOpen(false);
            setRequestsOpen(false);
            navigate(token ? '/home' : '/login');
          }}
        >
          💬 ChatApp
        </button>
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            {token ? (
              <>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link text-white text-decoration-none me-3"
                    onClick={() => {
                      setDropdownOpen(false);
                      setRequestsOpen(false);
                      navigate('/home');
                    }}
                  >
                    Home
                  </button>
                </li>

                {/* Friend Requests Dropdown */}
                <li className="nav-item dropdown me-3 position-relative">
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

                <li className="nav-item dropdown">
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
              </>
            ) : (
              <>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link text-white text-decoration-none me-2"
                    onClick={() => navigate('/login')}
                  >
                    Login
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className="btn btn-outline-light btn-sm px-3"
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