import { Container } from "./styles";
import { Reveal } from "../Reveal/Reveal";

interface AboutProps {
  data: any;
}

export function About({ data }: AboutProps) {
  return (
    <Container id="about">
      <div className="about-text">
        <Reveal animateIn="fadeInLeft">
          <h2>About me</h2>
        </Reveal>
        {data.about.map((about: any, i: number) => (
          <Reveal key={about} animateIn="fadeInLeft" delay={200}>
            <p>
              {about}
            </p>
          </Reveal>
        ))}
        <Reveal animateIn="fadeInLeft" delay={400}>
          <div className="education">
            <h3>Recent Education:</h3>
            <h4>{data.education[0].title}</h4>
            <p>{data.education[0].institute} {data.education[0].location} &nbsp;&nbsp; | &nbsp;&nbsp; {data.education[0].start} - {data.education[0].end}</p>
            <p><strong>THESIS:</strong> {data.education[0].thesis}</p>
            <p><strong>CGPA:</strong> {data.education[0].cgpa}</p>
          </div>
        </Reveal>
        <Reveal animateIn="fadeInLeft" delay={550}>
          <div className="experience">
            <h3>Recent Experience:</h3>
            <h4>{data.experience[0].title}</h4>
            <p>{data.experience[0].company} &nbsp;&nbsp; | &nbsp;&nbsp; {data.experience[0].start} - {data.experience[0].end}</p>
            <p>{data.experience[0].description}</p>
            <p>{data.experience[0].location}</p>
          </div>
        </Reveal>

        <Reveal animateIn="fadeInLeft" delay={400}>
          <h3>Here are my main skills:</h3>
        </Reveal>
        <div className="hard-skills">
          {data.technologies.filter((tech: any) => tech.icon).map((tech: any, i: number) => (
            <div key={tech.title} className="hability">
              <Reveal animateIn="fadeInUp" delay={100 + i * 10}>
                <img src={tech.icon} alt={tech.title} />
              </Reveal>
            </div>
          ))}
        </div>
      </div>
      <div className="about-image">
        <Reveal animateIn="fadeInRight" delay={210}>
          <img src={data.head.profile} alt={data.head.name} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        </Reveal>
      </div>
    </Container>
  )
}
