import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
describe('App Component', () => {
test('renders navbar', () => {
render(
<BrowserRouter>
<App />
</BrowserRouter>
);
expect(screen.getByRole('navigation')).toBeInTheDocument();
});
test('navigates to cart page', () => {
render(
<BrowserRouter>
<App />
</BrowserRouter>
);
const cartLink = screen.getByText(/cart/i);
fireEvent.click(cartLink);
expect(window.location.pathname).toBe('/cart');
});
});
