import { useState } from 'react';

import { GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';

import { getPrismicClient } from '../services/prismic';
import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({postsPagination, preview}: HomeProps) {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  async function handleLoadPost() {
    const requestMorePost = await fetch(
      nextPage
    ).then(response => response.json());
    console.log(requestMorePost)

    const newPosts = requestMorePost.results.map(post => {
      return {
        uid: post.uid,
        first_publication_date: post.first_publication_date,
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        },
      };
    });

    setPosts([...posts, ...newPosts]);
    setNextPage(requestMorePost.next_page)
  }

  return (
    <>
      <Header />
      <Head>
        <title>Home | Spacetrabeling.</title>s
      </Head>
      <div className={commonStyles.container}>
        {posts.map(post => (
          <div key={post.uid} className={styles.post}>
            <Link href={`/post/${post.uid}`}>
              <a>
                <strong>{post.data?.title}</strong>
              </a>
            </Link>
            <p>{post.data?.subtitle}</p>
            <footer>
              <div>
                <FiCalendar />
                <span>
                  {format(
                    new Date(post?.first_publication_date),
                    'dd MMM yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
                </span>
              </div>
              <div>
                <FiUser /> <span>{post.data?.author}</span>
              </div>
            </footer>
          </div>
        ))}

        {nextPage && (
          <button onClick={handleLoadPost} type="button">
            Carregar mais posts
          </button>
        )}
      </div>

    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 2,
      ref: previewData?.ref ?? null
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts,
      },
      preview,
    },
    revalidate: 60 * 60 * 8, // 8 hours
  };
};
