import { Footer } from './components/Footer/Footer'
import { Header } from './components/Header/Header'
import { Main } from './components/Main/Main'
import { GlobalStyle } from './styles/global'
import { Analytics } from "@vercel/analytics/react"
import data from './data.json';

import 'react-toastify/dist/ReactToastify.css'
function App() {
  return (
    <>
      <GlobalStyle></GlobalStyle>
      <Header name={data.head.name} resume={data.resume}></Header>
      <Main data={data}></Main>
      <Analytics />
      <Footer links={data.head.links}></Footer>
    </>
  )
}

export default App
