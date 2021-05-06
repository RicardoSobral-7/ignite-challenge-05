import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect } from 'react';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import Header from '../../components/Header';
import Link from 'next/link';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  prev_page: Post;
  next_page: Post;
}

export default function Post({ post, next_page, prev_page }: PostProps) {
  const router = useRouter();
  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));
    return total;
  }, 0);

  const readTime = Math.ceil(totalWords / 200);

  useEffect(() => {
    let script = document.createElement('script');
    let anchor = document.getElementById('inject-comments-for-uterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('repo', 'RicardoSobral-7/ignite-challenge-05');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-dark');
    anchor.appendChild(script);
  });

  return (
    <>
      <Header />
      <Head>
        <title>{post.data.title} | Spacetrabeling</title>
      </Head>
      <header className={styles.banner}>
        <div>
          <img src={post.data.banner.url} alt={post.data.title} />
        </div>
      </header>
      <div className={commonStyles.container}>
        <section>
          <header className={styles.information}>
            <h1>{post.data.title}</h1>
            <div>
              <FiCalendar />
              <span>
                {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </span>
              <FiUser />
              <span>{post.data.author}</span>
              <FiClock />
              <span>{readTime} min</span>
            </div>
            <p>
              {post.last_publication_date &&
                format(
                  new Date(post.last_publication_date),
                  "* 'editado em' dd MMM yyyy 'às' HH:mm",
                  {
                    locale: ptBR,
                  }
                )}
            </p>
          </header>
          {post.data.content.map(content => (
            <article className={styles.post} key={content.heading}>
              <h2>{content.heading}</h2>
              <div
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </article>
          ))}
          <footer className={styles.footer}>
            <div className={styles.fastNavigation}>
              {prev_page ? (
                <Link href={`/post/${prev_page.uid}`}>
                  <a>
                    {prev_page.data.title}
                    <span>Post anterior</span>
                  </a>
                </Link>
              ) : (
                <div></div>
              )}
              {next_page ? (
                <Link href={`/post/${next_page.uid}`}>
                  <a>
                    {next_page.data.title}
                    <span>Próximo post</span>
                  </a>
                </Link>
              ) : (
                <div></div>
              )}
            </div>
            <div id="inject-comments-for-uterances"/>
          </footer>
        </section>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const postsReponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ]);

  const paths = postsReponse.results.map(result => ({
    params: {
      slug: result.uid,
    },
  }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  if (!response.data) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const next_page = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const prev_page = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date]',
    }
  );

  const post = {
    uid: response.uid,
    last_publication_date: response.last_publication_date
      ? response.last_publication_date
      : '',
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => ({
        heading: content.heading || null,
        body: content.body,
      })),
    },
  };

  return {
    props: {
      post,
      next_page: next_page.results[0] || null,
      prev_page: prev_page.results[0] || null,
    },
  };
};
