import { Container } from "./styles";
import ScrollAnimation from "react-animate-on-scroll";

interface AboutProps {
  data: any;
}

export function About({ data }: AboutProps) {
  return (
    <Container id="about">
      <div className="about-text">
        <ScrollAnimation animateIn="fadeInLeft">
          <h2>About me</h2>
        </ScrollAnimation>
        {data.about.map((about: any, i: number) => (
          <ScrollAnimation key={about} animateIn="fadeInLeft" delay={(0.1 + (1 / 10)) * 1000}>
            <p>
              {about}
            </p>
          </ScrollAnimation>
        ))}
        <ScrollAnimation animateIn="fadeInLeft" delay={400}>
          <div className="education">
            <h3>Recent Education:</h3>
            <h4>{data.education[0].title}</h4>
            <p>{data.education[0].institute} {data.education[0].location} &nbsp;&nbsp; | &nbsp;&nbsp; {data.education[0].start} - {data.education[0].end}</p>
            <p><strong>THESIS:</strong> {data.education[0].thesis}</p>
            <p><strong>CGPA:</strong> {data.education[0].cgpa}</p>
          </div>
        </ScrollAnimation>
        <ScrollAnimation animateIn="fadeInLeft" delay={550}>
          <div className="experience">
            <h3>Recent Experience:</h3>
            <h4>{data.experience[0].title}</h4>
            <p>{data.experience[0].company} &nbsp;&nbsp; | &nbsp;&nbsp; {data.experience[0].start} - {data.experience[0].end}</p>
            <p>{data.experience[0].description}</p>
            <p>{data.experience[0].location}</p>
          </div>
        </ScrollAnimation>

        <ScrollAnimation animateIn="fadeInLeft" delay={0.4 * 1000}>
          <h3>Here are my main skills:</h3>
        </ScrollAnimation>
        <div className="hard-skills">
          {data.technologies.map((tech: any, i: number) => (
            <div key={tech.title} className="hability">
              <ScrollAnimation animateIn="fadeInUp" delay={(0.1 + (i / 100)) * 1000}>
                <img src={tech.icon} alt={tech.title} />
              </ScrollAnimation>
            </div>
          ))}
        </div>
      </div>
      <div className="about-image">
        <ScrollAnimation animateIn="fadeInRight" delay={0.21 * 1000}>
          <img src={data.head.profile} alt={data.head.name} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        </ScrollAnimation>
      </div>
    </Container>
  )
}
