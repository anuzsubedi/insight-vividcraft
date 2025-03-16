import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import useAuthState from '../hooks/useAuthState';

const AdminRoute = ({ children }) => {
    const { user, isAuthenticated } = useAuthState();
    
    if (!isAuthenticated || !user?.isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
};

AdminRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

export default AdminRoute;