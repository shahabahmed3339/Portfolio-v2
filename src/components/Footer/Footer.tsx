import { Links } from '../Links/links';
import { Container } from './styles';

interface FooterProps {
  links: any;
}

export function Footer({ links }: FooterProps) {
  return (
    <Container className="footer">
      <div>
        <p>
          This Website was made with <img src="/assets/react-icon.svg" alt="React" />
        </p>
      </div>
      <Links links={links} />
    </Container>
  )
}
