import { Container } from "./styles";
import { Form } from "../Form/Form";

interface ContactProps {
  head: any;
}


export function Contact({ head }: ContactProps) {

  return (
    <Container id="contact">
      <header>
        <h2>Contact</h2>
        <p>Ready to get started on your project? </p>
        <p>Contact me now for a Free consultation.</p>
      </header>
      <div className="contacts">
        <div>
          <a href={`mailto:${head.email}`}><img src="/assets/email-icon.svg" alt="Email" /></a>
          <a href={`mailto:${head.email}`}>{head.email}</a>
        </div>
        <div>
          <a href={`tel:${head.phone}`}><img src="/assets/phone-icon.svg" alt="Phone No" /></a>
          <a href={`tel:${head.phone}`}>{head.phone}</a>
        </div>
      </div>
      <Form></Form>
    </Container>
  )
}