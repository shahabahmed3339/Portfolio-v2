import { BrowserRouter } from "react-router-dom"
import { Container } from "./styles"
import { Reveal } from "../Reveal/Reveal"
import { NavHashLink } from "react-router-hash-link"
import { Links } from "../Links/links";

interface HeroProps {
  head: any;
}

export function Hero({ head }: HeroProps) {
  return (
    <Container id="home">
      <div className="hero-text">
        <Reveal animateIn="fadeInUp">
          <p>Hello <img src="/assets/Hello.gif" alt="Hello" width="20px" />, I'm</p>
        </Reveal>
        <Reveal animateIn="fadeInUp" delay={200}>
          <h1>{head.name}</h1>
        </Reveal>
        <Reveal animateIn="fadeInUp" delay={400}>
          <h3>{head.title}</h3>
        </Reveal>
        <Reveal animateIn="fadeInUp" delay={600}>
          <p className="small-resume">{head.totalExperience}+ Year{head.totalExperience > 1 ? 's' : ''} Experience</p>
        </Reveal>
        <Reveal animateIn="fadeInUp" delay={800}>
          <BrowserRouter>
            <NavHashLink smooth to="#contact" className="button">Contact</NavHashLink>
          </BrowserRouter>
        </Reveal>
        <Reveal animateIn="fadeInUp" delay={1000}>
          <Links links={head.links} />
        </Reveal>
      </div>
      <div className="hero-image">
        <Reveal animateIn="fadeInRight" delay={1000}>
          <img src="/assets/developer.png" alt="Developer" />
        </Reveal>
      </div>
    </Container>
  )
}