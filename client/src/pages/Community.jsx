import React, { useEffect, useState } from 'react'
import { dummyPublishedCreationData } from '../assets/assets'
import { Heart } from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import axios from 'axios'
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

const Community = () => {

  const [creations, setCreations] = useState([])

  const [loading, setLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState({});

  const { getToken } = useAuth();

  const { user } = useUser();

  const fetchCreations = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/user/get-published-creations', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })

      if (data.success) {
        setCreations(data.creations)
      } else {
        toast.error(data.message);
      }

    } catch (error) {
      toast.error(error.message);
    }
    setLoading(false);
  }

  const imageLikeToggle = async (id) => {

    setLikeLoading(prev => ({ ...prev, [id]: true }));

    try {
      const { data } = await axios.post('/api/user/toggle-like-creation', { id }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })

      if (data.success) {
        toast.success(data.message)
        setCreations(prev =>
        prev.map(c => {
          if (c.id === id) {
            const userHasLiked = c.likes?.includes(user.id);
            return {
              ...c,
              likes: userHasLiked
                ? c.likes.filter(u => u !== user.id) 
                : [...(c.likes || []), user.id] 
            };
          }
          return c;
        })
      );
      } else {
        toast.error(data.message);
      }

    } catch (error) {
      toast.error(data.message);
    }
    setLikeLoading(prev => ({ ...prev, [id]: false }));
  }

  useEffect(() => {
    if (user) {
      fetchCreations();
    }
  }, [user])

  return !loading ? (
    <div className='flex-1 h-full flex flex-col gap-4 p-6' >
      Creations
      <div className='bg-white h-full w-full rounded-xl overflow-y-scroll' >
        {creations.map((creation, index) => (
          <div key={index} className='relative group inline-block pl-3 pt-3 w-100 sm:max-w-1/2 lg:max-w-1/3' >
            <img src={creation.content} alt="" className='w-full h-full object-cover rounded-lg' />

            <div className='absolute bottom-0 top-0 right-0 left-3 flex gap-2 items-end justify-end group-hover:justify-between p-3 group-hover:bg-gradient-to-b from-transparent to-black/80 text-white rounded-lg'>
              <p className='text-sm hidden group-hover:block' >{creation.prompt}</p>
              <div className='flex gap-1 items-center' >
                <p>{creation.likes?.length || 0}</p>

                <div className='relative w-5 h-5'>
                  {likeLoading[creation.id] ? (
                    <span className='w-4 h-4 rounded-full border-2 border-t-transparent animate-spin block'></span>
                  ) : (
                    <Heart
                      onClick={() => imageLikeToggle(creation.id)}
                      className={`min-w-5 h-5 hover:cursor-pointer hover:scale-110 cursor-pointer ${creation.likes?.includes(user.id) ? 'fill-red-500 text-red-600' : 'text-white'}`}
                    />
                  )}
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  ) : (
    <div className='flex justify-center items-center h-full' >
      <span className='w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin'></span>
    </div>
  )
}

export default Community