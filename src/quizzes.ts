/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Quiz } from './types';

export const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: 'frontend-mastery',
    title: 'Frontend Mastery (React & TypeScript)',
    description: 'Test your knowledge of advanced React concepts, hooks, state updates, rendering optimization, and TypeScript type safety.',
    durationMinutes: 10,
    questions: [
      {
        id: 'fe-1',
        text: 'Which hook should be used to memoize a computed value between renders to optimize performance?',
        type: 'mcq',
        options: [
          'useCallback',
          'useMemo',
          'useRef',
          'useEffect'
        ],
        correctAnswer: 'useMemo',
        category: 'Performance',
        explanation: 'useMemo is designed specifically to memoize the result of a calculation between renders, only recalculating when its dependency array changes.'
      },
      {
        id: 'fe-2',
        text: 'What is the absolute key difference between `useRef` and `useState`?',
        type: 'mcq',
        options: [
          'useRef values are read-only, while useState is read-write.',
          'Changing a useRef value does not trigger a component re-render, whereas changing state via useState does.',
          'useRef can only hold DOM references, while useState can hold any JS object.',
          'useRef values persist across renders, while useState is reset.'
        ],
        correctAnswer: 'Changing a useRef value does not trigger a component re-render, whereas changing state via useState does.',
        category: 'React Core',
        explanation: 'Updating a useRef ref.current value does not cause React to trigger a component re-render, making it ideal for storing mutable values that don\'t impact visual output.'
      },
      {
        id: 'fe-3',
        text: 'In TypeScript, what keyword is used to create a type that represents the keys of another type or interface?',
        type: 'short',
        correctAnswer: 'keyof',
        category: 'TypeScript',
        explanation: 'The `keyof` operator takes an object type and produces a string or numeric literal union of its keys.'
      },
      {
        id: 'fe-4',
        text: 'Which React 18 feature allows you to mark state updates as non-blocking transition updates to preserve app responsiveness?',
        type: 'short',
        correctAnswer: 'startTransition',
        category: 'React 18',
        explanation: 'The `startTransition` API (or `useTransition` hook) allows you to mark updates as transitions, letting React prioritize urgent inputs like typing over heavy UI renders.'
      },
      {
        id: 'fe-5',
        text: 'When using useEffect, what does returning a function from the effect callback do?',
        type: 'mcq',
        options: [
          'It specifies the next state of the component.',
          'It acts as the cleanup function, executed before the effect re-runs or when the component unmounts.',
          'It triggers an asynchronous reload of the effect.',
          'It forces a deep structural comparison of the dependencies.'
        ],
        correctAnswer: 'It acts as the cleanup function, executed before the effect re-runs or when the component unmounts.',
        category: 'React Hooks',
        explanation: 'Returning a function from useEffect defines a cleanup callback. React runs this before applying the effect again and when the component is unmounted, preventing memory leaks (e.g. clearing timers or subscriptions).'
      },
      {
        id: 'fe-6',
        text: 'What TypeScript utility type constructs a type with all properties of Type set to optional?',
        type: 'short',
        correctAnswer: 'Partial',
        category: 'TypeScript',
        explanation: 'The `Partial<Type>` utility type returns a type where every field in the original type is made optional (e.g. adding `?` to each property).'
      }
    ]
  },
  {
    id: 'web-engineering',
    title: 'Web Engineering & System Design',
    description: 'Challenge your understanding of backend performance, web architecture, HTTP protocols, API patterns, and database scaling.',
    durationMinutes: 10,
    questions: [
      {
        id: 'we-1',
        text: 'Which HTTP response status code represents a "401 Unauthorized" vs a "403 Forbidden" response?',
        type: 'mcq',
        options: [
          '401 means the user is unknown (unauthenticated), while 403 means the user is known but does not have permission (unauthorized).',
          '401 means a server error occurred, while 403 means a client payload was too large.',
          '401 means the page has moved permanently, while 403 means it is temporary.',
          '401 and 403 are identical status codes and can be used interchangeably.'
        ],
        correctAnswer: '401 means the user is unknown (unauthenticated), while 403 means the user is known but does not have permission (unauthorized).',
        category: 'Security',
        explanation: '401 (Unauthenticated) indicates that the request needs user credentials, while 403 (Forbidden) means the server understands who you are, but you are not allowed to perform this action.'
      },
      {
        id: 'we-2',
        text: 'Which architectural style represents a protocol-agnostic, stateless architecture based on resources, uniquely identified by URIs, manipulated using standard verbs?',
        type: 'short',
        correctAnswer: 'REST',
        category: 'Architecture',
        explanation: 'REST (Representational State Transfer) is a widely adopted web service architectural design pattern that utilizes standard HTTP methods (GET, POST, PUT, DELETE) to manage resources.'
      },
      {
        id: 'we-3',
        text: 'What type of database scaling involves adding more servers or nodes to a cluster to partition and distribute data (horizontal scaling)?',
        type: 'mcq',
        options: [
          'Vertical Scaling (Scaling Up)',
          'Sharding',
          'Indexing',
          'Normalization'
        ],
        correctAnswer: 'Sharding',
        category: 'Databases',
        explanation: 'Sharding is a horizontal database partitioning method that stores rows of a database table in multiple database instances or nodes, allowing query capacity to scale out.'
      },
      {
        id: 'we-4',
        text: 'What does the abbreviation "CORS" stand for in web security?',
        type: 'short',
        correctAnswer: 'Cross-Origin Resource Sharing',
        category: 'Security',
        explanation: 'CORS stands for Cross-Origin Resource Sharing, a browser mechanism that uses additional HTTP headers to tell browsers to give a web application running at one origin access to selected resources from a different origin.'
      },
      {
        id: 'we-5',
        text: 'Which web networking protocol provides a full-duplex, persistent, low-overhead communication channel over a single TCP connection?',
        type: 'short',
        correctAnswer: 'WebSocket',
        category: 'Networking',
        explanation: 'WebSockets facilitate real-time, bi-directional, persistent socket connections between client and server, avoiding standard HTTP polling overhead.'
      }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'custom_quizzes';

export function getCustomQuizzes(): Quiz[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as Quiz[];
    }
  } catch (e) {
    console.error('Failed to load custom quizzes from local storage', e);
  }
  return [];
}

export function getAllQuizzes(): Quiz[] {
  return [...DEFAULT_QUIZZES, ...getCustomQuizzes()];
}

export function addCustomQuiz(quiz: Quiz) {
  const current = getCustomQuizzes();
  current.push(quiz);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
}

export function deleteCustomQuiz(quizId: string) {
  const current = getCustomQuizzes();
  const updated = current.filter(q => q.id !== quizId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
}
