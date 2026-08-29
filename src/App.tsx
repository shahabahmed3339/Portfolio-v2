import { Footer } from './components/Footer/Footer'
import { Header } from './components/Header/Header'
import { Main } from './components/Main/Main'
import { GlobalStyle } from './styles/global'
import { Analytics } from "@vercel/analytics/react"
import data from './data.json';

function App() {
  return (
    <>
      <GlobalStyle></GlobalStyle>
      <Header data={data}></Header>
      <Main data={data}></Main>
      <Analytics />
      <Footer links={data.head.links}></Footer>
    </>
  )
}

export default App
