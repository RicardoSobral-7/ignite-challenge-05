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
}

export default function Home(props: HomeProps) {
  const [posts, setPosts] = useState<Post[]>(props.postsPagination.results);
  const [nextPage, setNextPage] = useState(props.postsPagination.next_page);

  return (
    <>
      <Head>
        <title>Home | Spacetrabeling.</title>
      </Head>
      <div className={commonStyles.container}>
        {posts.map(post => (
          <div key={post.uid} className={styles.post}>
            <Link href={`/post/${post.uid}`}>
              <a>
                <strong>{post.data.title}</strong>
              </a>
            </Link>
            <p>{post.data.subtitle}</p>
            <footer>
              <div>
                <FiCalendar /> <span>{post.first_publication_date}</span>
              </div>
              <div>
                <FiUser /> <span>{post.data.author}</span>
              </div>
            </footer>
          </div>
        ))}
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({
  preview = false,
}) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 2,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR,
        }
      ),
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
      preview
    },
    revalidate: 60 * 60 * 8 // 8 hours
  };
};
